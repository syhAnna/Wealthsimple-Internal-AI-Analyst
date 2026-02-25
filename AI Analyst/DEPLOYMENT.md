# 🚀 Deployment Guide

Complete guide for deploying the AI Analyst Platform to production.

---

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Local Development](#local-development)
- [Docker Deployment](#docker-deployment)
- [Kubernetes Deployment](#kubernetes-deployment)
- [CI/CD Setup](#cicd-setup)
- [Monitoring Setup](#monitoring-setup)
- [Security Hardening](#security-hardening)
- [Troubleshooting](#troubleshooting)

---

## ✅ Prerequisites

### Required Services

- **Kubernetes Cluster** (v1.24+)
  - EKS, GKE, AKS, or self-hosted
  - Minimum 3 nodes (2 vCPU, 4GB RAM each)
  
- **Container Registry**
  - Docker Hub, ECR, GCR, or ACR
  
- **External Services**
  - OpenAI API account
  - PostgreSQL database (managed or self-hosted)
  - Redis instance (managed or self-hosted)
  - Pinecone account (optional)

### Required Tools

```bash
# Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"

# Install k6 (load testing)
brew install k6  # macOS
# or
wget https://github.com/grafana/k6/releases/download/v0.47.0/k6-v0.47.0-linux-amd64.tar.gz

# Install Docker
# Follow: https://docs.docker.com/get-docker/
```

---

## 💻 Local Development

### 1. Clone and Setup

```bash
git clone https://github.com/wealthsimple/ai-analyst.git
cd ai-analyst

# Copy environment template
cp .env.example .env

# Edit .env with your credentials
nano .env
```

### 2. Start Dependencies

```bash
# Start PostgreSQL and Redis
docker-compose up -d postgres redis

# Wait for services to be ready
docker-compose ps
```

### 3. Run Application

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Or build and run
npm run build
npm start
```

### 4. Verify

```bash
# Health check
curl http://localhost:3000/health

# Test query
curl -X POST http://localhost:3000/query \
  -H "Content-Type: application/json" \
  -H "x-user-id: test_user" \
  -H "x-user-role: analyst" \
  -d '{"query": "Show total active users"}'
```

---

## 🐳 Docker Deployment

### Build Image

```bash
# Build
docker build -t ai-analyst:latest .

# Tag for registry
docker tag ai-analyst:latest your-registry/ai-analyst:v1.0.0

# Push
docker push your-registry/ai-analyst:v1.0.0
```

### Run with Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop services
docker-compose down
```

### Production Docker Compose

```yaml
version: '3.8'

services:
  app:
    image: your-registry/ai-analyst:v1.0.0
    restart: always
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    env_file:
      - .env.production
    depends_on:
      - redis
      - postgres
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

---

## ☸️ Kubernetes Deployment

### 1. Prepare Secrets

```bash
# Create namespace
kubectl create namespace ai-analyst

# Create secrets from .env file
kubectl create secret generic ai-analyst-secrets \
  --from-env-file=.env.production \
  -n ai-analyst

# Or use the template
cp k8s/secrets.example.yaml k8s/secrets.yaml
# Edit k8s/secrets.yaml with real values
kubectl apply -f k8s/secrets.yaml
```

### 2. Deploy Application

```bash
# Apply all manifests
kubectl apply -f k8s/

# Or step by step
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/hpa.yaml
```

### 3. Verify Deployment

```bash
# Check pods
kubectl get pods -n ai-analyst

# Check services
kubectl get svc -n ai-analyst

# Check HPA
kubectl get hpa -n ai-analyst

# View logs
kubectl logs -n ai-analyst -l app=ai-analyst -f

# Describe pod for issues
kubectl describe pod -n ai-analyst <pod-name>
```

### 4. Expose Service

**Option A: LoadBalancer (Cloud)**

```yaml
apiVersion: v1
kind: Service
metadata:
  name: ai-analyst-lb
  namespace: ai-analyst
spec:
  type: LoadBalancer
  selector:
    app: ai-analyst
  ports:
    - port: 80
      targetPort: 3000
```

**Option B: Ingress (Recommended)**

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ai-analyst-ingress
  namespace: ai-analyst
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
    - hosts:
        - api.example.com
      secretName: ai-analyst-tls
  rules:
    - host: api.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: ai-analyst-service
                port:
                  number: 80
```

### 5. Update Deployment

```bash
# Update image
kubectl set image deployment/ai-analyst \
  app=your-registry/ai-analyst:v1.1.0 \
  -n ai-analyst

# Rollback if needed
kubectl rollout undo deployment/ai-analyst -n ai-analyst

# Check rollout status
kubectl rollout status deployment/ai-analyst -n ai-analyst
```

---

## 🔄 CI/CD Setup

### GitHub Actions

1. **Add Repository Secrets**

Go to Settings → Secrets → Actions:

```
DOCKER_USERNAME=your-dockerhub-username
DOCKER_PASSWORD=your-dockerhub-token
KUBE_CONFIG=<base64-encoded-kubeconfig>
```

2. **Workflows are Auto-Configured**

- `.github/workflows/ci.yml` - Runs on every push/PR
- `.github/workflows/cd.yml` - Deploys on main branch

3. **Manual Deployment**

```bash
# Trigger workflow manually
gh workflow run cd.yml
```

### GitLab CI/CD

```yaml
# .gitlab-ci.yml
stages:
  - test
  - build
  - deploy

test:
  stage: test
  script:
    - npm install
    - npm run lint
    - npm run typecheck
    - npm test

build:
  stage: build
  script:
    - docker build -t $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA .
    - docker push $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA

deploy:
  stage: deploy
  script:
    - kubectl set image deployment/ai-analyst app=$CI_REGISTRY_IMAGE:$CI_COMMIT_SHA -n ai-analyst
  only:
    - main
```

---

## 📊 Monitoring Setup

### Prometheus & Grafana

```yaml
# prometheus-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
  namespace: monitoring
data:
  prometheus.yml: |
    scrape_configs:
      - job_name: 'ai-analyst'
        kubernetes_sd_configs:
          - role: pod
            namespaces:
              names:
                - ai-analyst
        relabel_configs:
          - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
            action: keep
            regex: true
```

### Jaeger Tracing

```bash
# Install Jaeger operator
kubectl create namespace observability
kubectl apply -f https://github.com/jaegertracing/jaeger-operator/releases/download/v1.51.0/jaeger-operator.yaml -n observability

# Deploy Jaeger instance
kubectl apply -f - <<EOF
apiVersion: jaegertracing.io/v1
kind: Jaeger
metadata:
  name: jaeger
  namespace: observability
spec:
  strategy: production
  storage:
    type: elasticsearch
EOF
```

---

## 🔒 Security Hardening

### 1. Network Policies

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: ai-analyst-netpol
  namespace: ai-analyst
spec:
  podSelector:
    matchLabels:
      app: ai-analyst
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              name: ingress-nginx
      ports:
        - protocol: TCP
          port: 3000
  egress:
    - to:
        - namespaceSelector: {}
      ports:
        - protocol: TCP
          port: 5432  # PostgreSQL
        - protocol: TCP
          port: 6379  # Redis
```

### 2. Pod Security Standards

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: ai-analyst
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
```

### 3. RBAC

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: ai-analyst-sa
  namespace: ai-analyst
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: ai-analyst-role
  namespace: ai-analyst
rules:
  - apiGroups: [""]
    resources: ["configmaps", "secrets"]
    verbs: ["get", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: ai-analyst-rolebinding
  namespace: ai-analyst
subjects:
  - kind: ServiceAccount
    name: ai-analyst-sa
roleRef:
  kind: Role
  name: ai-analyst-role
  apiGroup: rbac.authorization.k8s.io
```

---

## 🔧 Troubleshooting

### Pod Not Starting

```bash
# Check pod status
kubectl get pods -n ai-analyst

# View pod events
kubectl describe pod <pod-name> -n ai-analyst

# Check logs
kubectl logs <pod-name> -n ai-analyst

# Common issues:
# - Missing secrets
# - Image pull errors
# - Resource limits too low
```

### High Memory Usage

```bash
# Check resource usage
kubectl top pods -n ai-analyst

# Increase memory limits in deployment.yaml
resources:
  limits:
    memory: "1Gi"  # Increase from 512Mi
```

### Database Connection Issues

```bash
# Test connectivity from pod
kubectl exec -it <pod-name> -n ai-analyst -- sh
nc -zv postgres-host 5432

# Check secrets
kubectl get secret ai-analyst-secrets -n ai-analyst -o yaml
```

### Load Testing Issues

```bash
# Run load test
npm run load-test

# If failures occur:
# 1. Check HPA is scaling
kubectl get hpa -n ai-analyst

# 2. Check pod resources
kubectl top pods -n ai-analyst

# 3. Review logs for errors
kubectl logs -n ai-analyst -l app=ai-analyst --tail=100
```

---

## 📞 Support

For issues or questions:

1. Check logs: `kubectl logs -n ai-analyst -l app=ai-analyst`
2. Review metrics: Access Grafana dashboard
3. Check traces: Access Jaeger UI
4. Review documentation: See README.md

---

**Deployment checklist:**

- [ ] Secrets configured
- [ ] Database accessible
- [ ] Redis accessible
- [ ] Container registry accessible
- [ ] Health checks passing
- [ ] HPA configured
- [ ] Monitoring enabled
- [ ] Load testing completed
- [ ] Security policies applied
- [ ] Backup strategy in place