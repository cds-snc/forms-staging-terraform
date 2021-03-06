// SQS for reliability queue and dead letter

resource "aws_sqs_queue" "reliability_queue" {
  name                        = "submission_processing.fifo"
  delay_seconds               = 5
  max_message_size            = 2048
  message_retention_seconds   = 345600
  fifo_queue                  = true
  content_based_deduplication = true
  receive_wait_time_seconds   = 0
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.deadletter_queue.arn
    maxReceiveCount     = 5
  })

  kms_master_key_id                 = "alias/aws/sqs"
  kms_data_key_reuse_period_seconds = 300

  tags = {
    (var.billing_tag_key) = var.billing_tag_value
  }
}

resource "aws_sqs_queue" "deadletter_queue" {
  name                              = "deadletter_queue.fifo"
  delay_seconds                     = 60
  max_message_size                  = 262144
  message_retention_seconds         = 1209600
  fifo_queue                        = true
  content_based_deduplication       = true
  receive_wait_time_seconds         = 20
  kms_master_key_id                 = "alias/aws/sqs"
  kms_data_key_reuse_period_seconds = 300
  tags = {
    (var.billing_tag_key) = var.billing_tag_value
  }
}