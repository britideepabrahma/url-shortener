variable "account_id" {
  description = "Cloudflare account ID"
  type        = string
}

variable "worker_name" {
  description = "Worker name, which becomes part of the URL"
  type        = string
  default     = "go"
}

variable "links" {
  description = "Short links as slug => target URL"
  type        = map(string)

  validation {
    condition     = alltrue([for slug in keys(var.links) : can(regex("^[a-z0-9-]+$", slug))])
    error_message = "Slugs may only contain lowercase letters, numbers, and hyphens."
  }

  validation {
    condition     = alltrue([for target in values(var.links) : startswith(target, "https://")])
    error_message = "All target URLs must start with https://."
  }

  validation {
    condition     = !contains(keys(var.links), "health")
    error_message = "The slug 'health' is reserved."
  }
}