# Data Model

Authoritative reference. Implemented as Prisma schema in `backend/prisma/schema.prisma`.

## Entities

### User
| Field | Type | Notes |
|-------|------|-------|
| id | uuid PK | |
| email | citext unique | nullable for OAuth-only profiles? No — always required. |
| emailVerified | boolean | default false |
| name | string | optional |
| passwordHash | string nullable | null for OAuth-only accounts |
| role | enum `admin` \| `user` | default `user` |
| status | enum `draft` \| `pending_confirmation` \| `active` \| `blocked` \| `deactivated` | default `pending_confirmation` |
| createdAt / updatedAt | timestamptz | |
| lastLoginAt | timestamptz | nullable |
| anonymizedAt | timestamptz | nullable; set when GDPR-erased |

Indexes: `email` unique, `role`, `status`.

### OAuthIdentity
| id | uuid PK |
| userId | uuid FK → User |
| provider | enum `google` \| `facebook` |
| providerUserId | string |
| createdAt | timestamptz |

Unique: (`provider`, `providerUserId`).

### Consent
| id | uuid PK |
| userId | uuid FK |
| document | enum `terms` \| `privacy` \| `marketing` |
| version | string |
| acceptedAt | timestamptz |
| ipAddress | inet nullable |
| userAgent | string nullable |

Index: (`userId`, `document`).

### RefreshToken
| id | uuid PK |
| userId | uuid FK |
| tokenHash | string |
| issuedAt | timestamptz |
| expiresAt | timestamptz |
| revokedAt | timestamptz nullable |
| ipAddress | inet |
| userAgent | string |

Index: `userId`, `tokenHash`.

### EmailVerificationToken
| id | uuid PK |
| userId | uuid FK |
| tokenHash | string unique |
| expiresAt | timestamptz |
| consumedAt | timestamptz nullable |

### PasswordResetToken
Same shape as EmailVerificationToken.

### Category
Static, seeded:
| id | string PK | (`hospitals`, `doctors`, `insurance_funds`) |
| name | string | display name (English; localized via FE i18n keys) |

### Institution
| id | uuid PK |
| categoryId | string FK → Category |
| name | string |
| email | string | target inbox for complaints |
| active | boolean | default true |
| createdAt / updatedAt | timestamptz |

Index: (`categoryId`, `active`).

### Complaint
| id | uuid PK |
| publicId | string unique | format `VLC-YYYY-NNNNNN`, sequential per year |
| userId | uuid FK nullable | null for anonymous |
| categoryId | string FK → Category |
| institutionId | uuid FK nullable | one of institutionId / institutionFreeText required |
| institutionFreeText | string nullable | |
| title | string | |
| body | text | |
| urgent | boolean | default false |
| contactName | string nullable | as provided |
| contactEmail | citext nullable | as provided; triggers user-copy email if present |
| status | enum (see below) | default per submission type |
| submissionType | enum `authenticated` \| `anonymous` | derived but stored for fast filtering |
| createdAt / updatedAt | timestamptz |
| reviewedById | uuid FK nullable | admin who approved/rejected |
| reviewedAt | timestamptz nullable |
| forwardedAt | timestamptz nullable |
| closedAt | timestamptz nullable |
| ipAddress | inet nullable | retained for abuse moderation |
| userAgent | string nullable |

Status enum: `submitted`, `pending_review`, `approved`, `rejected`, `forwarded`, `closed`.

Indexes: `publicId` unique, `userId`, `categoryId`, `institutionId`, `status`, `createdAt`, full-text (`title`, `body`) via GIN on `to_tsvector('english', title || ' ' || body)` (recreated as `simple` for BG when needed).

### Attachment
| id | uuid PK |
| complaintId | uuid FK |
| originalFilename | string |
| storagePath | string | randomized name on disk |
| mimeType | string |
| size | int |
| createdAt | timestamptz |

Index: `complaintId`. Cascade-delete with complaint.

### ComplaintEvent
| id | uuid PK |
| complaintId | uuid FK |
| event | enum `created`, `pending_review`, `approved`, `rejected`, `forwarded`, `closed`, `email_dispatched`, `email_failed`, `attachment_added` |
| actorId | uuid FK nullable | null for system events |
| at | timestamptz |
| metadata | jsonb | event-specific payload |

Index: (`complaintId`, `at`).

### EmailOutbox
| id | uuid PK |
| toAddress | string |
| fromAddress | string |
| subject | string |
| bodyHtml | text |
| bodyText | text |
| template | string | for analytics (e.g. `complaint.to_institution`) |
| relatedComplaintId | uuid FK nullable |
| relatedUserId | uuid FK nullable |
| status | enum `pending` \| `sent` \| `failed` \| `dead` |
| attempts | int default 0 |
| lastAttemptAt | timestamptz nullable |
| lastError | text nullable |
| nextAttemptAt | timestamptz | initialised to now |
| createdAt | timestamptz |
| sentAt | timestamptz nullable |

Index: (`status`, `nextAttemptAt`).

### AuditLog
| id | uuid PK |
| actorId | uuid FK nullable |
| event | string | namespaced: `auth.login.succeeded`, `complaint.state.changed`, `admin.user.role_updated` |
| target | string nullable | object reference, e.g. `complaint:<publicId>` |
| ipAddress | inet nullable |
| userAgent | string nullable |
| at | timestamptz |
| metadata | jsonb |

Index: `at`, `event`, `actorId`.

### Configuration
| key | string PK |
| value | string |
| updatedAt | timestamptz |

Seeded with: `min_body_length=100`, `captcha_required_anonymous=true`, etc.

---

## Seeds

- Categories: hospitals, doctors, insurance_funds.
- One admin user (created by seed script using `ADMIN_EMAIL` + `ADMIN_INITIAL_PASSWORD` env, status `active`, emailVerified true).
- Ombudsman address: stored in config (`ombudsman_email`).
- A small set of demo institutions (3 per category) for development only — gated behind `SEED_DEMO_DATA=true`.

## Migrations

Prisma migrations live in `backend/prisma/migrations/`. The initial migration ships the schema above. Production deploys run `prisma migrate deploy` before app start.
