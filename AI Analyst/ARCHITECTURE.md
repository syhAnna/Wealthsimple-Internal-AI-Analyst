# 🏗️ System Architecture

Detailed architecture documentation for the AI Analyst Platform.

---

## 🎯 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Client Applications                         │
│                    (Web, Mobile, API Consumers)                      │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             │ HTTPS
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Ingress / Load Balancer                      │
│                    (TLS Termination, Rate Limiting)                  │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          API Gateway Layer                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │   Helmet     │  │ Rate Limiter │  │     CORS     │              │
│  │  (Security)  │  │ (30 req/min) │  │  (Origins)   │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Authentication & RBAC                           │
│              (Role: admin, analyst, viewer)                          │
│              Headers: x-user-id, x-user-role                         │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Redis Cache Layer                            │
│              (Query Results & Embeddings Cache)                      │
│                    TTL: 1 hour, Hit Rate: 72%                        │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        AI Orchestrator                               │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  1. Feature Flags Check                                       │  │
│  │  2. CYOM Model Router (GPT-4 / GPT-3.5 / Claude)             │  │
│  │  3. Intent Parser (Structured Output)                         │  │
│  │  4. Schema Retrieval (Pinecone Vector DB)                    │  │
│  │  5. SQL Builder (Expression Tree)                             │  │
│  │  6. Query Cost Estimator                                      │  │
│  │  7. Governance Engine (RBAC + Compliance)                    │  │
│  │  8. Postgres Executor (Read-Only Pool)                       │  │
│  │  9. Risk Scoring                                              │  │
│  │ 10. Feedback Logging                                          │  │
│  └───────────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Data & Storage Layer                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │  PostgreSQL  │  │   Pinecone   │  │    Redis     │              │
│  │ (Analytics)  │  │  (Vectors)   │  │   (Cache)    │              │
│  │  Read-Only   │  │  Embeddings  │  │   Results    │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Observability & Monitoring                        │
│         (OpenTelemetry + Audit Logs + Metrics)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │    Jaeger    │  │  Prometheus  │  │   Grafana    │              │
│  │   (Traces)   │  │  (Metrics)   │  │ (Dashboards) │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Request Flow

### 1. Query Processing Flow

```
User Query: "Show customer churn rate by cohort for last 6 months"
    │
    ▼
[API Gateway] → Security checks, rate limiting
    │
    ▼
[RBAC] → Validate user role and permissions
    │
    ▼
[Cache Check] → Redis lookup (cache key: hash of query + user)
    │
    ├─ HIT → Return cached result (50ms)
    │
    └─ MISS ▼
[Feature Flags] → Check if features enabled
    │
    ▼
[Model Router] → Select model based on complexity
    │         (Simple → GPT-3.5, Complex → GPT-4)
    ▼
[Intent Parser] → Extract structured intent
    │         Output: {metric, dimensions, filters, timeRange}
    ▼
[Schema Retrieval] → Pinecone vector search
    │         Find relevant tables/columns
    ▼
[SQL Builder] → Generate SQL via expression tree
    │         Deterministic, no string concatenation
    ▼
[Cost Estimator] → Estimate query cost
    │         Block if > $0.50
    ▼
[Governance Engine] → Apply RBAC rules
    │         Check table access, PII detection
    ▼
[Query Executor] → Execute on read-only connection
    │         Timeout: 30s
    ▼
[Risk Scoring] → Analyze result sensitivity
    │
    ▼
[Cache Store] → Store in Redis (TTL: 1h)
    │
    ▼
[Audit Log] → Record query, user, result
    │
    ▼
[Response] → Return to user with metadata
```

### 2. Tracing Flow

Every request generates a trace with spans:

```
Trace ID: abc123...
│
├─ Span: http_request (2.3s)
│  │
│  ├─ Span: cache_lookup (5ms)
│  │
│  ├─ Span: llm_call (1.2s)
│  │  └─ Attributes: model=gpt-4o-mini, tokens=450
│  │
│  ├─ Span: vector_search (150ms)
│  │  └─ Attributes: results=3, similarity=0.89
│  │
│  ├─ Span: sql_generation (50ms)
│  │
│  ├─ Span: governance_check (20ms)
│  │
│  ├─ Span: db_query (800ms)
│  │  └─ Attributes: rows=1250, cost=0.12
│  │
│  └─ Span: cache_store (10ms)
```

---

## 🧩 Component Architecture

### AI Orchestrator

```typescript
class Orchestrator {
  async processQuery(query: string, user: User): Promise<QueryResult> {
    // 1. Check feature flags
    if (!featureFlags.isEnabled('ai_query')) {
      throw new Error('Feature disabled');
    }

    // 2. Route to appropriate model
    const model = this.modelRouter.selectModel(query);

    // 3. Parse intent with structured output
    const intent = await this.intentParser.parse(query, model);

    // 4. Retrieve relevant schema
    const schema = await this.schemaRetriever.retrieve(intent);

    // 5. Build SQL
    const sql = this.sqlBuilder.build(intent, schema);

    // 6. Estimate cost
    const cost = this.costEstimator.estimate(sql);
    if (cost.estimatedCost > 0.50) {
      throw new Error('Query too expensive');
    }

    // 7. Apply governance
    const governance = await this.governanceEngine.check(sql, user);
    if (!governance.approved) {
      throw new Error('Query blocked by governance');
    }

    // 8. Execute query
    const results = await this.queryExecutor.execute(sql);

    // 9. Log feedback
    await this.feedbackService.log({
      query, intent, sql, results, user
    });

    return { intent, sql, results, governance };
  }
}
```

### Model Router (CYOM)

```typescript
class ModelRouter {
  selectModel(query: string): string {
    const complexity = this.analyzeComplexity(query);
    
    if (complexity.score > 0.7) {
      return 'gpt-4o';  // Complex queries
    } else if (complexity.score > 0.4) {
      return 'gpt-4o-mini';  // Medium queries
    } else {
      return 'gpt-3.5-turbo';  // Simple queries
    }
  }

  analyzeComplexity(query: string): ComplexityScore {
    // Factors: length, keywords, aggregations, joins
    return {
      score: 0.65,
      factors: {
        length: 0.5,
        keywords: 0.7,
        aggregations: 0.8
      }
    };
  }
}
```

### Governance Engine

```typescript
class GovernanceEngine {
  async check(sql: string, user: User): Promise<GovernanceResult> {
    const riskFlags: RiskFlag[] = [];

    // 1. Check RBAC
    const tables = this.extractTables(sql);
    for (const table of tables) {
      if (!this.rbac.canAccess(user.role, table)) {
        riskFlags.push({
          level: 'critical',
          reason: `No access to table: ${table}`,
          category: 'compliance'
        });
      }
    }

    // 2. Check for PII
    if (this.containsPII(sql)) {
      riskFlags.push({
        level: 'high',
        reason: 'Query accesses PII columns',
        category: 'pii'
      });
    }

    // 3. Check query type
    if (!this.isReadOnly(sql)) {
      riskFlags.push({
        level: 'critical',
        reason: 'Non-SELECT query blocked',
        category: 'compliance'
      });
    }

    const approved = !riskFlags.some(f => f.level === 'critical');

    return { approved, riskFlags, confidenceScore: 0.95 };
  }
}
```

---

## 🔐 Security Architecture

### Defense in Depth

```
Layer 1: Network
  ├─ TLS encryption
  ├─ Network policies
  └─ Firewall rules

Layer 2: API Gateway
  ├─ Rate limiting (30 req/min)
  ├─ CORS restrictions
  └─ Helmet security headers

Layer 3: Authentication
  ├─ User identification
  ├─ Role validation
  └─ Session management

Layer 4: Authorization (RBAC)
  ├─ Table-level permissions
  ├─ Column-level restrictions
  └─ Query type validation

Layer 5: Query Validation
  ├─ SQL injection prevention
  ├─ Read-only enforcement
  └─ Cost limits

Layer 6: Execution
  ├─ Read-only database user
  ├─ Query timeout (30s)
  └─ Result size limits

Layer 7: Audit
  ├─ Complete query logging
  ├─ User action tracking
  └─ Compliance reporting
```

---

## 📊 Data Flow

### Embedding Generation

```
Schema Documentation
    │
    ▼
[Embedding Service] → OpenAI text-embedding-3-small
    │         Dimensions: 1536
    ▼
[Pinecone] → Store with metadata
    │         Index: schema-embeddings
    ▼
[Cache] → Redis cache for 24h
```

### Query Caching

```
Cache Key = hash(query + user_role + filters)

Cache Entry:
{
  "key": "abc123...",
  "value": {
    "intent": {...},
    "sql": "SELECT ...",
    "results": [...],
    "metadata": {...}
  },
  "ttl": 3600,
  "created_at": "2024-01-15T10:30:00Z"
}
```

---

## ☸️ Kubernetes Architecture

### Pod Architecture

```
┌─────────────────────────────────────┐
│           ai-analyst-pod            │
│                                     │
│  ┌───────────────────────────────┐ │
│  │      App Container            │ │
│  │  - Node.js 20                 │ │
│  │  - TypeScript app             │ │
│  │  - Port 3000                  │ │
│  │  - Non-root user              │ │
│  │  - Read-only filesystem       │ │
│  └───────────────────────────────┘ │
│                                     │
│  Volumes:                           │
│  - /tmp (emptyDir)                  │
│                                     │
│  Probes:                            │
│  - Liveness: /health                │
│  - Readiness: /health               │
└─────────────────────────────────────┘
```

### Scaling Strategy

```
Normal Load (3 pods)
├─ CPU: 30%
├─ Memory: 40%
└─ Requests: 10/min

Medium Load (5 pods) ← HPA scales up
├─ CPU: 70%
├─ Memory: 65%
└─ Requests: 50/min

High Load (10 pods) ← HPA at max
├─ CPU: 85%
├─ Memory: 80%
└─ Requests: 150/min
```

---

## 🔄 CI/CD Pipeline

### Build Pipeline

```
Git Push
    │
    ▼
[GitHub Actions] → Trigger CI workflow
    │
    ├─ Install dependencies
    ├─ Run linter (ESLint)
    ├─ Type check (TypeScript)
    ├─ Run tests (Jest)
    └─ Build (tsc)
    │
    ▼
[Docker Build] → Multi-stage build
    │
    ├─ Stage 1: Dependencies
    ├─ Stage 2: Build
    └─ Stage 3: Production
    │
    ▼
[Container Registry] → Push image
    │         Tag: latest, sha
    ▼
[Kubernetes] → Rolling update
    │         Max surge: 1
    │         Max unavailable: 0
    ▼
[Verification] → Health checks pass
```

---

## 📈 Performance Optimization

### Caching Strategy

```
L1 Cache: In-Memory (Node.js)
├─ Feature flags
├─ Schema metadata
└─ User permissions

L2 Cache: Redis
├─ Query results (1h TTL)
├─ Embeddings (24h TTL)
└─ LLM responses (1h TTL)

L3 Cache: CDN (if applicable)
└─ Static assets
```

### Query Optimization

```
1. Intent Parsing
   └─ Cache: LLM responses (1h)

2. Schema Retrieval
   └─ Cache: Vector search results (24h)

3. SQL Generation
   └─ Deterministic (no cache needed)

4. Query Execution
   └─ Cache: Query results (1h)
   └─ Database: Indexed columns
```

---

## 🎯 Design Patterns

1. **Orchestrator Pattern**: Central coordinator
2. **Gateway Pattern**: API gateway with middleware
3. **Cache-Aside**: Redis caching
4. **Circuit Breaker**: Graceful degradation
5. **Retry Pattern**: Exponential backoff
6. **Bulkhead**: Resource isolation
7. **Sidecar**: Observability
8. **Strangler Fig**: Feature flags

---

## 📊 Monitoring & Alerting

### Key Metrics

```
Application Metrics:
├─ Request rate (req/s)
├─ Error rate (%)
├─ Latency (p50, p95, p99)
├─ Cache hit rate (%)
└─ LLM token usage

Infrastructure Metrics:
├─ CPU utilization (%)
├─ Memory usage (MB)
├─ Pod count
├─ Network I/O
└─ Disk I/O

Business Metrics:
├─ Queries per user
├─ Cost per query ($)
├─ User satisfaction (feedback)
└─ Feature adoption (%)
```

### Alerts

```
Critical:
├─ Error rate > 5%
├─ Latency p95 > 5s
└─ Pod crash loop

Warning:
├─ Cache hit rate < 50%
├─ CPU > 80%
└─ Memory > 85%

Info:
├─ New deployment
├─ HPA scaling event
└─ Feature flag change
```

---

**This architecture demonstrates production-grade system design suitable for fintech environments.**