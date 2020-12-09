provider "aws" {
  region = var.region
}

provider "aws" {
  alias  = "us-east-1"
  region = "us-east-1"
}

provider "random" {
}

provider "template" {
}

terraform {
  backend "s3" {
    bucket = "staging-gcforms"
    key    = "aws/backend/default.tfstate"
    region = "ca-central-1"

    dynamodb_table = "terraform-lock"
    encrypt        = true
  }
}
