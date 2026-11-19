terraform {
  required_version = ">= 1.6"

  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.0"
    }
  }

  cloud {
    organization = "Britideepa"
    workspaces {
      name = "url-shortener"
    }
  }
}

# Reads the API token from the CLOUDFLARE_API_TOKEN environment variable
provider "cloudflare" {}

resource "cloudflare_workers_kv_namespace" "links" {
  account_id = var.account_id
  title      = "url-shortener-links"
}

resource "cloudflare_workers_kv" "link" {
  for_each     = var.links
  account_id   = var.account_id
  namespace_id = cloudflare_workers_kv_namespace.links.id
  key_name     = "link:${each.key}"
  value        = each.value
}

resource "cloudflare_workers_script" "shortener" {
  account_id         = var.account_id
  script_name        = var.worker_name
  main_module        = "worker.js"
  content_file       = "${path.module}/../worker/worker.js"
  content_sha256     = filesha256("${path.module}/../worker/worker.js")
  compatibility_date = "2026-11-01"

  bindings = [{
    name         = "LINKS"
    type         = "kv_namespace"
    namespace_id = cloudflare_workers_kv_namespace.links.id
  }]
}

resource "cloudflare_workers_script_subdomain" "shortener" {
  account_id  = var.account_id
  script_name = cloudflare_workers_script.shortener.script_name
  enabled     = true
}