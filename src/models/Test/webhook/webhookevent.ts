import mongoose, { Schema, Document } from "mongoose";

interface IEvent {
  name: string;
  description?: string;
}

export interface IWebhookEventCategory extends Document {
  category: string;
  category_display: string;
  events: IEvent[];
}

const EventSchema = new Schema<IEvent>({
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
});

const WebhookEventCategorySchema = new Schema<IWebhookEventCategory>(
  {
    category: {
      type: String,
      required: true,
      unique: true,
    },

    category_display: {
      type: String,
      required: true,
    },

    events: {
      type: [EventSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IWebhookEventCategory>(
  "WebhookEventCategory",
  WebhookEventCategorySchema
);