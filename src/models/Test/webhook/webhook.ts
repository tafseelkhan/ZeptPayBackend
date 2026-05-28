import mongoose from "mongoose";

// Event Detail Interface
interface IEventDetail {
  name: string;
  title: string;
  description: string;
}

// Category Interface
interface IEventCategory {
  category: string;
  category_display: string;
  events: IEventDetail[];
}

interface IDeliveryLog {
  whsecNumber: string;         // Number jiske liye webhook call hua
  event: string;               // Event name
  attempt: number;             // Total attempts for this event & number
  status: "success" | "failed"; 
  lastError?: string;          // Agar fail hua to error
  lastCalledAt?: Date;         // Last attempt time
}

interface IWebhook extends mongoose.Document {
  developerUserId: mongoose.Types.ObjectId;
  url: string;
  localUrl?: string;
  webhook: string;
  events: IEventCategory[];    // 🔥 Changed from string[] to IEventCategory[]
  mode: "test" | "live";
  label?: string;
  isActive: boolean;

  // Overall delivery stats
  totalAttempts: number;
  successAttempts: number;
  failedAttempts: number;

  // Per-number delivery logs
  deliveryLogs: IDeliveryLog[];

  lastCalledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Event Detail Schema
const EventDetailSchema = new mongoose.Schema<IEventDetail>(
  {
    name: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
  },
  { _id: false }
);

// Event Category Schema
const EventCategorySchema = new mongoose.Schema<IEventCategory>(
  {
    category: { type: String, required: true },
    category_display: { type: String, required: true },
    events: { type: [EventDetailSchema], required: true },
  },
  { _id: false }
);

const DeliveryLogSchema = new mongoose.Schema<IDeliveryLog>(
  {
    whsecNumber: { type: String, required: true },
    event: { type: String, required: true },
    attempt: { type: Number, default: 0 },
    status: { type: String, enum: ["success", "failed"], required: true },
    lastError: { type: String },
    lastCalledAt: { type: Date },
  },
  { _id: false }
);

const WebhookSchema = new mongoose.Schema<IWebhook>(
  {
    developerUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    url: { type: String, required: true },
    localUrl: { type: String },
    webhook: { type: String, required: true, unique: true },
    events: { type: [EventCategorySchema], default: [] }, // 🔥 Changed to EventCategorySchema
    mode: { type: String, enum: ["test", "live"], required: true, index: true },
    label: { type: String },
    isActive: { type: Boolean, default: true },

    // Overall Stats
    totalAttempts: { type: Number, default: 0 },
    successAttempts: { type: Number, default: 0 },
    failedAttempts: { type: Number, default: 0 },

    // Per-Number Delivery Logs
    deliveryLogs: { type: [DeliveryLogSchema], default: [] },

    lastCalledAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model<IWebhook>("Webhook", WebhookSchema);