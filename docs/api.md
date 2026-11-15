# Read API

For CIC's org dashboard (or any reporting tool) to pull program health without logging in.
Machine-readable spec: [openapi.yaml](openapi.yaml).

## Authentication

1. Sign in as a CIC admin → **Admin → Read API keys → Create**.
2. Copy the key (`cic_live_…`). It is shown once; only a SHA-256 hash is stored.
3. Send it as a Bearer token. Revoke it from the same screen at any time.

```bash
curl -H "Authorization: Bearer cic_live_XXXXXXXX" https://<your-domain>/api/v1/stats
curl -H "Authorization: Bearer cic_live_XXXXXXXX" "https://<your-domain>/api/v1/stats?cohort=Maryvale%20Fall%202026"
```

Limits: 60 requests per minute per key. Responses are never cached (`Cache-Control: no-store`).

## `GET /api/v1/stats`

| Query | Optional | Meaning |
|---|---|---|
| `cohort` | yes | Only this cohort (exact name, e.g. `Maryvale Fall 2026`) |

**Privacy:** the response contains **aggregates only**: no student names, resume codes or answers.

```json
{
  "generated_at": "2026-11-15T07:00:00.000Z",
  "definition": "learning_gain = mean(posttest score − pretest score), 0–100 scale, students who took both",
  "totals": { "students": 37, "active_7d": 30, "activities_completed": 510, "hints_given": 22 },
  "learning_gain": {
    "overall": { "pre": 39, "post": 70.8, "gain": 31.8, "n": 59 },
    "by_cohort":  [{ "label": "Maryvale Fall 2026", "pre": 36.4, "post": 70.5, "gain": 34.1, "n": 22 }],
    "by_concept": [{ "label": "loops", "pre": 30.0, "post": 65.0, "gain": 35.0, "n": 8 }],
    "by_module":  [{ "label": "Loops", "pre": 30.0, "post": 65.0, "gain": 35.0, "n": 8 }]
  },
  "classes": [{
    "id": "uuid", "name": "AI Academy · Period 3", "school": "Maryvale High School", "cohort": "Maryvale Fall 2026",
    "instructor": "Jordan Rivera", "organization": "Coding in Color",
    "students": 14, "active_7d": 12, "modules_assigned": 3, "completion_pct": 61,
    "learning_gain": { "pre": 36.4, "post": 70.5, "gain": 34.1, "n": 22 }
  }]
}
```

`n` is the number of student-module pairs with both a pretest and a posttest.

## Errors

| Status | Meaning |
|---|---|
| 401 | Missing, malformed, unknown or revoked key |
| 429 | More than 60 requests in a minute |
