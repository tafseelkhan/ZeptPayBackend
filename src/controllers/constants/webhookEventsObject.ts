const EVENT_TYPES = {
  // Payment Intent Events
  PAYMENT_INTENT_AMOUNT_CAPTURABLE_UPDATED:
    "zeptpay-flixora.payment_intent.amount_capturable_updated",
  PAYMENT_INTENT_CANCELED: "zeptpay-flixora.payment_intent.canceled",
  PAYMENT_INTENT_CREATED: "zeptpay-flixora.payment_intent.created",
  PAYMENT_INTENT_PARTIALLY_FUNDED:
    "zeptpay-flixora.payment_intent.partially_funded",
  PAYMENT_INTENT_PAYMENT_FAILED:
    "zeptpay-flixora.payment_intent.payment_failed",
  PAYMENT_INTENT_PROCESSING: "zeptpay-flixora.payment_intent.processing",
  PAYMENT_INTENT_REQUIRES_ACTION:
    "zeptpay-flixora.payment_intent.requires_action",
  PAYMENT_INTENT_SUCCEEDED: "zeptpay-flixora.payment_intent.succeeded",

  // Charge Events
  CHARGE_CAPTURED: "zeptpay-flixora.charge.captured",
  CHARGE_EXPIRED: "zeptpay-flixora.charge.expired",
  CHARGE_FAILED: "zeptpay-flixora.charge.failed",
  CHARGE_PENDING: "zeptpay-flixora.charge.pending",
  CHARGE_REFUNDED: "zeptpay-flixora.charge.refunded",
  CHARGE_SUCCEEDED: "zeptpay-flixora.charge.succeeded",
  CHARGE_UPDATED: "zeptpay-flixora.charge.updated",
  CHARGE_DISPUTE_CLOSED: "zeptpay-flixora.charge.dispute.closed",
  CHARGE_DISPUTE_CREATED: "zeptpay-flixora.charge.dispute.created",
  CHARGE_DISPUTE_FUNDS_REINSTATED:
    "zeptpay-flixora.charge.dispute.funds_reinstated",
  CHARGE_DISPUTE_FUNDS_WITHDRAWN:
    "zeptpay-flixora.charge.dispute.funds_withdrawn",
  CHARGE_DISPUTE_UPDATED: "zeptpay-flixora.charge.dispute.updated",

  // Refund Events
  REFUND_CREATED: "zeptpay-flixora.refund.created",
  REFUND_FAILED: "zeptpay-flixora.refund.failed",
  REFUND_UPDATED: "zeptpay-flixora.refund.updated",

  // Checkout Session Events
  CHECKOUT_SESSION_ASYNC_PAYMENT_FAILED:
    "zeptpay-flixora.checkout.session.async_payment_failed",
  CHECKOUT_SESSION_ASYNC_PAYMENT_SUCCEEDED:
    "zeptpay-flixora.checkout.session.async_payment_succeeded",
  CHECKOUT_SESSION_COMPLETED: "zeptpay-flixora.checkout.session.completed",
  CHECKOUT_SESSION_EXPIRED: "zeptpay-flixora.checkout.session.expired",

  // Invoice Events
  INVOICE_CREATED: "zeptpay-flixora.invoice.created",
  INVOICE_DELETED: "zeptpay-flixora.invoice.deleted",
  INVOICE_FINALIZATION_FAILED: "zeptpay-flixora.invoice.finalization_failed",
  INVOICE_FINALIZED: "zeptpay-flixora.invoice.finalized",
  INVOICE_MARKED_UNCOLLECTIBLE: "zeptpay-flixora.invoice.marked_uncollectible",
  INVOICE_PAID: "zeptpay-flixora.invoice.paid",
  INVOICE_PAYMENT_ACTION_REQUIRED:
    "zeptpay-flixora.invoice.payment_action_required",
  INVOICE_PAYMENT_FAILED: "zeptpay-flixora.invoice.payment_failed",
  INVOICE_PAYMENT_SUCCEEDED: "zeptpay-flixora.invoice.payment_succeeded",
  INVOICE_SENT: "zeptpay-flixora.invoice.sent",
  INVOICE_UPCOMING: "zeptpay-flixora.invoice.upcoming",
  INVOICE_UPDATED: "zeptpay-flixora.invoice.updated",
  INVOICE_VOIDED: "zeptpay-flixora.invoice.voided",

  // Subscription Events
  CUSTOMER_SUBSCRIPTION_CREATED:
    "zeptpay-flixora.customer.subscription.created",
  CUSTOMER_SUBSCRIPTION_DELETED:
    "zeptpay-flixora.customer.subscription.deleted",
  CUSTOMER_SUBSCRIPTION_PAUSED: "zeptpay-flixora.customer.subscription.paused",
  CUSTOMER_SUBSCRIPTION_PENDING_UPDATE_APPLIED:
    "zeptpay-flixora.customer.subscription.pending_update_applied",
  CUSTOMER_SUBSCRIPTION_PENDING_UPDATE_EXPIRED:
    "zeptpay-flixora.customer.subscription.pending_update_expired",
  CUSTOMER_SUBSCRIPTION_RESUMED:
    "zeptpay-flixora.customer.subscription.resumed",
  CUSTOMER_SUBSCRIPTION_TRIAL_WILL_END:
    "zeptpay-flixora.customer.subscription.trial_will_end",
  CUSTOMER_SUBSCRIPTION_UPDATED:
    "zeptpay-flixora.customer.subscription.updated",
  CUSTOMER_SUBSCRIPTION_DISCOUNT_CREATED:
    "zeptpay-flixora.customer.subscription.discount.created",

  // Customer Events
  CUSTOMER_CREATED: "zeptpay-flixora.customer.created",
  CUSTOMER_DELETED: "zeptpay-flixora.customer.deleted",
  CUSTOMER_UPDATED: "zeptpay-flixora.customer.updated",
  CUSTOMER_DISCOUNT_CREATED: "zeptpay-flixora.customer.discount.created",
  CUSTOMER_DISCOUNT_DELETED: "zeptpay-flixora.customer.discount.deleted",
  CUSTOMER_DISCOUNT_UPDATED: "zeptpay-flixora.customer.discount.updated",
  CUSTOMER_SOURCE_CREATED: "zeptpay-flixora.customer.source.created",
  CUSTOMER_SOURCE_DELETED: "zeptpay-flixora.customer.source.deleted",
  CUSTOMER_SOURCE_EXPIRING: "zeptpay-flixora.customer.source.expiring",
  CUSTOMER_SOURCE_UPDATED: "zeptpay-flixora.customer.source.updated",
  CUSTOMER_TAX_ID_CREATED: "zeptpay-flixora.customer.tax_id.created",
  CUSTOMER_TAX_ID_DELETED: "zeptpay-flixora.customer.tax_id.deleted",
  CUSTOMER_TAX_ID_UPDATED: "zeptpay-flixora.customer.tax_id.updated",
  CUSTOMER_BALANCE_UPDATED: "zeptpay-flixora.customer.balance.updated",

  // Payment Method Events
  PAYMENT_METHOD_ATTACHED: "zeptpay-flixora.payment_method.attached",
  PAYMENT_METHOD_AUTOMATICALLY_UPDATED:
    "zeptpay-flixora.payment_method.automatically_updated",
  PAYMENT_METHOD_DETACHED: "zeptpay-flixora.payment_method.detached",
  PAYMENT_METHOD_UPDATED: "zeptpay-flixora.payment_method.updated",

  // Product Events
  PRODUCT_CREATED: "zeptpay-flixora.product.created",
  PRODUCT_DELETED: "zeptpay-flixora.product.deleted",
  PRODUCT_UPDATED: "zeptpay-flixora.product.updated",

  // Price Events
  PRICE_CREATED: "zeptpay-flixora.price.created",
  PRICE_DELETED: "zeptpay-flixora.price.deleted",
  PRICE_UPDATED: "zeptpay-flixora.price.updated",

  // Payout Events
  PAYOUT_CANCELED: "zeptpay-flixora.payout.canceled",
  PAYOUT_CREATED: "zeptpay-flixora.payout.created",
  PAYOUT_FAILED: "zeptpay-flixora.payout.failed",
  PAYOUT_PAID: "zeptpay-flixora.payout.paid",
  PAYOUT_RECONCILIATION_COMPLETED:
    "zeptpay-flixora.payout.reconciliation_completed",
  PAYOUT_UPDATED: "zeptpay-flixora.payout.updated",

  // Radar Events
  RADAR_EARLY_FRAUD_WARNING_CREATED:
    "zeptpay-flixora.radar.early_fraud_warning.created",
  RADAR_EARLY_FRAUD_WARNING_UPDATED:
    "zeptpay-flixora.radar.early_fraud_warning.updated",

  // Coupon Events
  COUPON_CREATED: "zeptpay-flixora.coupon.created",
  COUPON_DELETED: "zeptpay-flixora.coupon.deleted",
  COUPON_UPDATED: "zeptpay-flixora.coupon.updated",

  // Plan Events
  PLAN_CREATED: "zeptpay-flixora.plan.created",
  PLAN_DELETED: "zeptpay-flixora.plan.deleted",
  PLAN_UPDATED: "zeptpay-flixora.plan.updated",

  // Tax Rate Events
  TAX_RATE_CREATED: "zeptpay-flixora.tax_rate.created",
  TAX_RATE_UPDATED: "zeptpay-flixora.tax_rate.updated",

  // Webhook Endpoint Events
  WEBHOOK_ENDPOINT_CREATED: "zeptpay-flixora.webhook_endpoint.created",
  WEBHOOK_ENDPOINT_DELETED: "zeptpay-flixora.webhook_endpoint.deleted",
  WEBHOOK_ENDPOINT_UPDATED: "zeptpay-flixora.webhook_endpoint.updated",

  // Setup Intent Events
  SETUP_INTENT_CANCELED: "zeptpay-flixora.setup_intent.canceled",
  SETUP_INTENT_CREATED: "zeptpay-flixora.setup_intent.created",
  SETUP_INTENT_REQUIRES_ACTION: "zeptpay-flixora.setup_intent.requires_action",
  SETUP_INTENT_SETUP_FAILED: "zeptpay-flixora.setup_intent.setup_failed",
  SETUP_INTENT_SUCCEEDED: "zeptpay-flixora.setup_intent.succeeded",

  // Identity Verification Events
  IDENTITY_VERIFICATION_SESSION_CANCELED:
    "zeptpay-flixora.identity.verification_session.canceled",
  IDENTITY_VERIFICATION_SESSION_CREATED:
    "zeptpay-flixora.identity.verification_session.created",
  IDENTITY_VERIFICATION_SESSION_PROCESSING:
    "zeptpay-flixora.identity.verification_session.processing",
  IDENTITY_VERIFICATION_SESSION_REDACTED:
    "zeptpay-flixora.identity.verification_session.redacted",
  IDENTITY_VERIFICATION_SESSION_REQUIRES_INPUT:
    "zeptpay-flixora.identity.verification_session.requires_input",
  IDENTITY_VERIFICATION_SESSION_VERIFIED:
    "zeptpay-flixora.identity.verification_session.verified",

  // Issuing Events
  ISSUING_AUTHORIZATION_REQUEST:
    "zeptpay-flixora.issuing_authorization.request",
  ISSUING_AUTHORIZATION_CREATED:
    "zeptpay-flixora.issuing_authorization.created",
  ISSUING_AUTHORIZATION_UPDATED:
    "zeptpay-flixora.issuing_authorization.updated",
  ISSUING_CARD_CREATED: "zeptpay-flixora.issuing_card.created",
  ISSUING_CARD_UPDATED: "zeptpay-flixora.issuing_card.updated",
  ISSUING_CARDHOLDER_CREATED: "zeptpay-flixora.issuing_cardholder.created",
  ISSUING_CARDHOLDER_UPDATED: "zeptpay-flixora.issuing_cardholder.updated",
  ISSUING_TRANSACTION_CREATED: "zeptpay-flixora.issuing_transaction.created",
  ISSUING_TRANSACTION_UPDATED: "zeptpay-flixora.issuing_transaction.updated",

  // Account & Person Events
  ACCOUNT_UPDATED: "zeptpay-flixora.account.updated",
  PERSON_CREATED: "zeptpay-flixora.person.created",
  PERSON_DELETED: "zeptpay-flixora.person.deleted",
  PERSON_UPDATED: "zeptpay-flixora.person.updated",

  // File Events
  FILE_CREATED: "zeptpay-flixora.file.created",

  // Balance Events
  BALANCE_AVAILABLE: "zeptpay-flixora.balance.available",

  // Capability Events
  CAPABILITY_UPDATED: "zeptpay-flixora.capability.updated",

  // Account External Events
  ACCOUNT_APPLICATION_AUTHORIZED:
    "zeptpay-flixora.account.application.authorized",
  ACCOUNT_APPLICATION_DEAUTHORIZED:
    "zeptpay-flixora.account.application.deauthorized",
  ACCOUNT_EXTERNAL_ACCOUNT_CREATED:
    "zeptpay-flixora.account.external_account.created",
  ACCOUNT_EXTERNAL_ACCOUNT_DELETED:
    "zeptpay-flixora.account.external_account.deleted",
  ACCOUNT_EXTERNAL_ACCOUNT_UPDATED:
    "zeptpay-flixora.account.external_account.updated",

  // Billing Portal Events
  BILLING_PORTAL_CONFIGURATION_CREATED:
    "zeptpay-flixora.billing_portal.configuration.created",
  BILLING_PORTAL_CONFIGURATION_UPDATED:
    "zeptpay-flixora.billing_portal.configuration.updated",
  BILLING_PORTAL_SESSION_CREATED:
    "zeptpay-flixora.billing_portal.session.created",

  // Quote Events
  QUOTE_ACCEPTED: "zeptpay-flixora.quote.accepted",
  QUOTE_CANCELED: "zeptpay-flixora.quote.canceled",
  QUOTE_CREATED: "zeptpay-flixora.quote.created",
  QUOTE_FINALIZED: "zeptpay-flixora.quote.finalized",

  // Reporting Events
  REPORTING_REPORT_RUN_CREATED: "zeptpay-flixora.reporting.report_run.created",
  REPORTING_REPORT_RUN_FAILED: "zeptpay-flixora.reporting.report_run.failed",
  REPORTING_REPORT_RUN_SUCCEEDED:
    "zeptpay-flixora.reporting.report_run.succeeded",

  // Review Events
  REVIEW_CLOSED: "zeptpay-flixora.review.closed",
  REVIEW_OPENED: "zeptpay-flixora.review.opened",
  REVIEW_APPROVED: "zeptpay-flixora.review.approved",

  // Shipping Events
  SHIPPING_RATE_CREATED: "zeptpay-flixora.shipping_rate.created",
  SHIPPING_RATE_UPDATED: "zeptpay-flixora.shipping_rate.updated",

  // Promotion Code Events
  PROMOTION_CODE_CREATED: "zeptpay-flixora.promotion_code.created",
  PROMOTION_CODE_UPDATED: "zeptpay-flixora.promotion_code.updated",

  // Your custom mappings
  PAYMENT_SUCCESS: "zeptpay-flixora.payment_intent.succeeded",
  PAYMENT_FAILED: "zeptpay-flixora.payment_intent.payment_failed",
  PAYMENT_PENDING: "zeptpay-flixora.payment_intent.processing",
};

export { EVENT_TYPES };