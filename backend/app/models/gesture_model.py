"""
BiLSTM + Transformer Gesture Recognition Model
Architecture: BiLSTM (2 layers, 256 hidden) → Transformer encoder (4 layers, 512 dim, 8 heads)
Input:  (batch, T=32, 66)  — 21*3 landmarks + 3 velocity
Output: (batch, num_classes)  softmax probabilities
Target: <15ms CPU inference after TorchScript/INT8 ONNX export
"""
from __future__ import annotations
import math
import torch
import torch.nn as nn
import torch.nn.functional as F


NUM_CLASSES   = 21
INPUT_DIM     = 66    # 21*3 landmarks + 3 velocity
SEQ_LEN       = 32
LSTM_HIDDEN   = 256
LSTM_LAYERS   = 2
TRANSFORMER_D = 512
TRANSFORMER_H = 8
TRANSFORMER_L = 4
DROPOUT       = 0.2


class PositionalEncoding(nn.Module):
    """Sinusoidal positional encoding injected before transformer."""
    def __init__(self, d_model: int, max_len: int = 64, dropout: float = 0.1):
        super().__init__()
        self.dropout = nn.Dropout(dropout)
        pe = torch.zeros(max_len, d_model)
        pos = torch.arange(max_len).unsqueeze(1)
        div = torch.exp(torch.arange(0, d_model, 2) * (-math.log(10000.0) / d_model))
        pe[:, 0::2] = torch.sin(pos * div)
        pe[:, 1::2] = torch.cos(pos * div)
        self.register_buffer("pe", pe.unsqueeze(0))  # (1, max_len, d_model)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.dropout(x + self.pe[:, :x.size(1)])


class GestureModel(nn.Module):
    """
    Hybrid BiLSTM + Transformer classifier.

    Stage 1 — BiLSTM: captures local temporal dependencies (finger motion).
    Stage 2 — Transformer encoder: captures global sequence context (whole gesture arc).
    Stage 3 — Classification head with label-smoothed softmax.

    LSTM equations (each layer, each direction):
      i_t = σ(W_i [h_{t-1}, x_t] + b_i)
      f_t = σ(W_f [h_{t-1}, x_t] + b_f)
      g_t = tanh(W_g [h_{t-1}, x_t] + b_g)
      o_t = σ(W_o [h_{t-1}, x_t] + b_o)
      c_t = f_t ⊙ c_{t-1} + i_t ⊙ g_t
      h_t = o_t ⊙ tanh(c_t)

    Attention (Transformer):
      Attention(Q,K,V) = softmax(QK^T / √d_k) · V
      Multi-head: concat(head_1, …, head_h) · W_O
    """

    def __init__(self, num_classes: int = NUM_CLASSES):
        super().__init__()

        # Input projection
        self.input_proj = nn.Sequential(
            nn.Linear(INPUT_DIM, LSTM_HIDDEN),
            nn.LayerNorm(LSTM_HIDDEN),
            nn.GELU(),
        )

        # BiLSTM stage
        self.bilstm = nn.LSTM(
            input_size=LSTM_HIDDEN,
            hidden_size=LSTM_HIDDEN,
            num_layers=LSTM_LAYERS,
            batch_first=True,
            bidirectional=True,
            dropout=DROPOUT,
        )

        # Project BiLSTM output (2*LSTM_HIDDEN) → Transformer dim
        self.lstm_proj = nn.Linear(LSTM_HIDDEN * 2, TRANSFORMER_D)

        # Positional encoding
        self.pos_enc = PositionalEncoding(TRANSFORMER_D, max_len=SEQ_LEN + 4, dropout=DROPOUT)

        # Transformer encoder
        enc_layer = nn.TransformerEncoderLayer(
            d_model=TRANSFORMER_D,
            nhead=TRANSFORMER_H,
            dim_feedforward=TRANSFORMER_D * 4,
            dropout=DROPOUT,
            activation="gelu",
            batch_first=True,
            norm_first=True,   # Pre-LN for training stability
        )
        self.transformer = nn.TransformerEncoder(enc_layer, num_layers=TRANSFORMER_L)

        # Classification head
        self.head = nn.Sequential(
            nn.LayerNorm(TRANSFORMER_D),
            nn.Linear(TRANSFORMER_D, TRANSFORMER_D // 2),
            nn.GELU(),
            nn.Dropout(DROPOUT),
            nn.Linear(TRANSFORMER_D // 2, num_classes),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        Args:
            x: (batch, seq_len, input_dim)
        Returns:
            logits: (batch, num_classes)
        """
        # Stage 1: project input
        h = self.input_proj(x)              # (B, T, LSTM_H)

        # Stage 2: BiLSTM
        h, _ = self.bilstm(h)               # (B, T, 2*LSTM_H)
        h = self.lstm_proj(h)               # (B, T, TRANSFORMER_D)

        # Stage 3: positional encoding + Transformer
        h = self.pos_enc(h)
        h = self.transformer(h)             # (B, T, TRANSFORMER_D)

        # Global average pool over time
        h = h.mean(dim=1)                   # (B, TRANSFORMER_D)

        return self.head(h)                 # (B, num_classes)

    def predict_proba(self, x: torch.Tensor) -> torch.Tensor:
        """Softmax probabilities — use this for inference."""
        with torch.no_grad():
            return F.softmax(self.forward(x), dim=-1)


if __name__ == "__main__":
    # Quick sanity check
    m = GestureModel()
    m.eval()
    dummy = torch.randn(1, SEQ_LEN, INPUT_DIM)
    out   = m(dummy)
    print(f"Model output shape: {out.shape}")  # (1, 21)
    params = sum(p.numel() for p in m.parameters())
    print(f"Parameters: {params:,}")
