import torch
import torch.nn as nn
from torch.autograd import Function

class GradientReversalLayer(Function):
    @staticmethod
    def forward(ctx, x, alpha):
        ctx.alpha = alpha
        return x.view_as(x)

    @staticmethod
    def backward(ctx, grad_output):
        output = grad_output.neg() * ctx.alpha
        return output, None

class ParkinsonHybridModel(nn.Module):
    def __init__(self, input_dim, bio_dim=5):
        super(ParkinsonHybridModel, self).__init__()
        
        # Shared Encoder
        self.encoder = nn.Sequential(
            nn.Linear(input_dim, 128),
            nn.BatchNorm1d(128),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(128, 64),
            nn.BatchNorm1d(64),
            nn.ReLU()
        )
        
        # 1. Classification Head
        self.cls_head = nn.Sequential(
            nn.Linear(64, 32),
            nn.ReLU(),
            nn.Linear(32, 1),
            nn.Sigmoid()
        )
        
        # 2. Regression Head
        self.reg_head = nn.Sequential(
            nn.Linear(64, 32),
            nn.ReLU(),
            nn.Linear(32, 1)
        )
        
        # 3. Biomarker Head (Dynamic Dimension)
        self.bio_head = nn.Sequential(
            nn.Linear(64, 32),
            nn.ReLU(),
            nn.Linear(32, bio_dim),
            nn.Sigmoid()
        )
        
        # 4. Domain Adversarial Head
        self.domain_head = nn.Sequential(
            nn.Linear(64, 32),
            nn.ReLU(),
            nn.Linear(32, 1),
            nn.Sigmoid()
        )

    def forward(self, x, alpha=0.0):
        features = self.encoder(x)
        p_cls = self.cls_head(features)
        p_reg = self.reg_head(features)
        p_bio = self.bio_head(features)
        
        rev_features = GradientReversalLayer.apply(features, alpha)
        p_dom = self.domain_head(rev_features)
        
        return p_cls, p_reg, p_bio, p_dom, features
