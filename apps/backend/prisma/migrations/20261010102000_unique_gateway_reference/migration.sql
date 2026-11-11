-- Guard against two payment rows claiming the same Razorpay order/payment.
-- Nullable keys allow cash payments and unresolved online intents.
CREATE UNIQUE INDEX "payments_gateway_order_id_key"
 ON "finance"."payments"("gateway_order_id");
CREATE UNIQUE INDEX "payments_gateway_payment_id_key"
 ON "finance"."payments"("gateway_payment_id");
