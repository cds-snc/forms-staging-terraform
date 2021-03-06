resource "aws_dynamodb_table" "reliability_queue" {
  name         = "ReliabilityQueue"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "SubmissionID"
  attribute {
    name = "SubmissionID"
    type = "S"
  }

  stream_enabled = false
  server_side_encryption {
    enabled     = true
    kms_key_arn = aws_kms_key.dynamoDB.arn
  }
  point_in_time_recovery {
    enabled = true
  }
}

resource "aws_dynamodb_table" "vault" {
  name         = "Vault"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "FormID"
  range_key    = "SubmissionID"

  attribute {
    name = "FormID"
    type = "S"
  }
  attribute {
    name = "SubmissionID"
    type = "S"
  }

  stream_enabled = false
  server_side_encryption {
    enabled     = true
    kms_key_arn = aws_kms_key.dynamoDB.arn
  }
  point_in_time_recovery {
    enabled = true
  }
}