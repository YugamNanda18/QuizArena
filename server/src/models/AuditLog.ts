import mongoose, { Document, Schema } from 'mongoose';

export interface IAuditLog extends Document {
  actorEmail: string;
  actorRole: string;
  action: string;
  targetResource: string;
  targetId?: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    actorEmail: { type: String, required: true },
    actorRole: { type: String, required: true },
    action: { type: String, required: true },
    targetResource: { type: String, required: true },
    targetId: { type: String },
    metadata: { type: Schema.Types.Mixed },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

AuditLogSchema.index({ timestamp: -1 });

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
