// src/config/env.ts

const requiredEnvVars = [
  "OPENAI_API_KEY",
  "REDIS_URL"
]

const optionalEnvVars = [
  "POSTGRES_URL",
  "PINECONE_API_KEY",
  "PINECONE_INDEX",
  "ALLOWED_ORIGIN",
  "NODE_ENV",
  "PORT"
]

export function validateEnvironment(): void {
  const missing: string[] = []

  requiredEnvVars.forEach(key => {
    if (!process.env[key]) {
      missing.push(key)
    }
  })

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables:\n${missing.map(v => `  - ${v}`).join("\n")}`
    )
  }

  // Warn about optional but recommended vars
  const missingOptional: string[] = []
  optionalEnvVars.forEach(key => {
    if (!process.env[key]) {
      missingOptional.push(key)
    }
  })

  if (missingOptional.length > 0) {
    console.warn(
      `Optional environment variables not set:\n${missingOptional.map(v => `  - ${v}`).join("\n")}`
    )
  }

  console.log("✓ Environment validation passed")
}

export function getEnv(key: string, defaultValue?: string): string {
  const value = process.env[key]
  if (!value && !defaultValue) {
    throw new Error(`Environment variable ${key} is not set`)
  }
  return value || defaultValue!
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production"
}

export function isDevelopment(): boolean {
  return process.env.NODE_ENV === "development" || !process.env.NODE_ENV
}

// Made with Bob
