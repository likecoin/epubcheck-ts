[**epubcheck-ts**](../README.md)

***

[epubcheck-ts](../globals.md) / CreateMessageOptions

# Interface: CreateMessageOptions

Defined in: messages/messages.ts:1261

Options for creating a validation message

## Properties

### id

> **id**: `"PKG-001"` \| `"PKG-003"` \| `"PKG-004"` \| `"PKG-005"` \| `"PKG-006"` \| `"PKG-007"` \| `"PKG-008"` \| `"PKG-009"` \| `"PKG-010"` \| `"PKG-011"` \| `"PKG-012"` \| `"PKG-013"` \| `"PKG-014"` \| `"PKG-015"` \| `"PKG-016"` \| `"PKG-017"` \| `"PKG-018"` \| `"PKG-020"` \| `"PKG-021"` \| `"PKG-022"` \| `"PKG-023"` \| `"PKG-024"` \| `"PKG-025"` \| `"PKG-026"` \| `"PKG-027"` \| `"OPF-001"` \| `"OPF-002"` \| `"OPF-003"` \| `"OPF-004"` \| `"OPF-005"` \| `"OPF-006"` \| `"OPF-007"` \| `"OPF-008"` \| `"OPF-009"` \| `"OPF-010"` \| `"OPF-011"` \| `"OPF-012"` \| `"OPF-013"` \| `"OPF-014"` \| `"OPF-015"` \| `"OPF-016"` \| `"OPF-017"` \| `"OPF-018"` \| `"OPF-021"` \| `"OPF-025"` \| `"OPF-026"` \| `"OPF-027"` \| `"OPF-028"` \| `"OPF-029"` \| `"OPF-030"` \| `"OPF-031"` \| `"OPF-032"` \| `"OPF-033"` \| `"OPF-034"` \| `"OPF-035"` \| `"OPF-036"` \| `"OPF-037"` \| `"OPF-038"` \| `"OPF-039"` \| `"OPF-040"` \| `"OPF-041"` \| `"OPF-042"` \| `"OPF-043"` \| `"OPF-044"` \| `"OPF-045"` \| `"OPF-046"` \| `"OPF-047"` \| `"OPF-048"` \| `"OPF-049"` \| `"OPF-050"` \| `"OPF-051"` \| `"OPF-052"` \| `"OPF-053"` \| `"OPF-054"` \| `"OPF-055"` \| `"OPF-056"` \| `"OPF-057"` \| `"OPF-058"` \| `"OPF-059"` \| `"OPF-060"` \| `"OPF-062"` \| `"OPF-063"` \| `"OPF-064"` \| `"OPF-065"` \| `"OPF-066"` \| `"OPF-067"` \| `"OPF-068"` \| `"OPF-069"` \| `"OPF-070"` \| `"OPF-071"` \| `"OPF-072"` \| `"OPF-073"` \| `"OPF-074"` \| `"OPF-075"` \| `"OPF-076"` \| `"OPF-077"` \| `"OPF-078"` \| `"OPF-079"` \| `"OPF-080"` \| `"OPF-081"` \| `"OPF-082"` \| `"OPF-083"` \| `"OPF-084"` \| `"OPF-085"` \| `"OPF-086"` \| `"OPF-087"` \| `"OPF-088"` \| `"OPF-089"` \| `"OPF-090"` \| `"OPF-091"` \| `"OPF-092"` \| `"OPF-093"` \| `"OPF-094"` \| `"OPF-095"` \| `"OPF-096"` \| `"OPF-097"` \| `"OPF-098"` \| `"OPF-099"` \| `"RSC-001"` \| `"RSC-002"` \| `"RSC-003"` \| `"RSC-004"` \| `"RSC-005"` \| `"RSC-006"` \| `"RSC-007"` \| `"RSC-007w"` \| `"RSC-008"` \| `"RSC-009"` \| `"RSC-010"` \| `"RSC-011"` \| `"RSC-012"` \| `"RSC-013"` \| `"RSC-014"` \| `"RSC-015"` \| `"RSC-016"` \| `"RSC-017"` \| `"RSC-018"` \| `"RSC-019"` \| `"RSC-020"` \| `"RSC-021"` \| `"RSC-022"` \| `"RSC-023"` \| `"RSC-024"` \| `"RSC-025"` \| `"RSC-026"` \| `"RSC-027"` \| `"RSC-028"` \| `"RSC-029"` \| `"RSC-030"` \| `"RSC-031"` \| `"RSC-032"` \| `"RSC-033"` \| `"HTM-001"` \| `"HTM-002"` \| `"HTM-003"` \| `"HTM-004"` \| `"HTM-005"` \| `"HTM-006"` \| `"HTM-007"` \| `"HTM-008"` \| `"HTM-009"` \| `"HTM-010"` \| `"HTM-011"` \| `"HTM-012"` \| `"HTM-013"` \| `"HTM-014"` \| `"HTM-015"` \| `"HTM-016"` \| `"HTM-017"` \| `"HTM-018"` \| `"HTM-019"` \| `"HTM-020"` \| `"HTM-021"` \| `"HTM-022"` \| `"HTM-023"` \| `"HTM-024"` \| `"HTM-025"` \| `"HTM-027"` \| `"HTM-028"` \| `"HTM-029"` \| `"HTM-033"` \| `"HTM-036"` \| `"HTM-038"` \| `"HTM-044"` \| `"HTM-045"` \| `"HTM-046"` \| `"HTM-047"` \| `"HTM-048"` \| `"HTM-049"` \| `"HTM-050"` \| `"HTM-051"` \| `"HTM-052"` \| `"HTM-053"` \| `"HTM-054"` \| `"HTM-055"` \| `"HTM-056"` \| `"HTM-057"` \| `"HTM-058"` \| `"HTM-059"` \| `"HTM-060a"` \| `"HTM-060b"` \| `"HTM-061"` \| `"CSS-001"` \| `"CSS-002"` \| `"CSS-003"` \| `"CSS-004"` \| `"CSS-005"` \| `"CSS-006"` \| `"CSS-007"` \| `"CSS-008"` \| `"CSS-009"` \| `"CSS-010"` \| `"CSS-011"` \| `"CSS-012"` \| `"CSS-013"` \| `"CSS-015"` \| `"CSS-016"` \| `"CSS-017"` \| `"CSS-019"` \| `"CSS-020"` \| `"CSS-021"` \| `"CSS-022"` \| `"CSS-023"` \| `"CSS-024"` \| `"CSS-025"` \| `"CSS-028"` \| `"CSS-029"` \| `"CSS-030"` \| `"NAV-001"` \| `"NAV-002"` \| `"NAV-003"` \| `"NAV-004"` \| `"NAV-005"` \| `"NAV-006"` \| `"NAV-007"` \| `"NAV-008"` \| `"NAV-009"` \| `"NAV-010"` \| `"NAV-011"` \| `"NCX-001"` \| `"NCX-002"` \| `"NCX-003"` \| `"NCX-004"` \| `"NCX-005"` \| `"NCX-006"` \| `"ACC-001"` \| `"ACC-002"` \| `"ACC-003"` \| `"ACC-004"` \| `"ACC-005"` \| `"ACC-006"` \| `"ACC-007"` \| `"ACC-008"` \| `"ACC-009"` \| `"ACC-010"` \| `"ACC-011"` \| `"ACC-012"` \| `"ACC-013"` \| `"ACC-014"` \| `"ACC-015"` \| `"ACC-016"` \| `"ACC-017"` \| `"MED-001"` \| `"MED-002"` \| `"MED-003"` \| `"MED-004"` \| `"MED-005"` \| `"MED-006"` \| `"MED-007"` \| `"MED-008"` \| `"MED-009"` \| `"MED-010"` \| `"MED-011"` \| `"MED-012"` \| `"MED-013"` \| `"MED-014"` \| `"MED-015"` \| `"MED-016"` \| `"MED-017"` \| `"MED-018"` \| `"SCP-001"` \| `"SCP-002"` \| `"SCP-003"` \| `"SCP-004"` \| `"SCP-005"` \| `"SCP-006"` \| `"SCP-007"` \| `"SCP-008"` \| `"SCP-009"` \| `"SCP-010"` \| `"INF-001"` \| `"CHK-001"` \| `"CHK-002"` \| `"CHK-003"` \| `"CHK-004"` \| `"CHK-005"` \| `"CHK-006"` \| `"CHK-007"` \| `"CHK-008"`

Defined in: messages/messages.ts:1263

Message ID from MessageId enum

***

### location?

> `optional` **location**: `EPUBLocation`

Defined in: messages/messages.ts:1267

Location where the issue was found

***

### message

> **message**: `string`

Defined in: messages/messages.ts:1265

Human-readable message

***

### severityOverride?

> `optional` **severityOverride**: [`Severity`](../type-aliases/Severity.md)

Defined in: messages/messages.ts:1271

Override the default severity (use sparingly)

***

### suggestion?

> `optional` **suggestion**: `string`

Defined in: messages/messages.ts:1269

Suggestion for fixing the issue
