# Pitfalls Research

**Domain:** Web milestone delivery risks
**Researched:** 2026-03-20
**Confidence:** MEDIUM

## Key Risks

1. **Theme bolted on too late** - causes duplicated styling and inconsistent contrast.
2. **shadcn/ui installed after custom UI work starts** - causes refactor churn and mixed component patterns.
3. **Desktop assumptions left in runtime wiring** - breaks browser startup and interaction expectations.
4. **Mobile layout treated as afterthought** - results in clipped lyrics and poor touch usability.

## Prevention

- Install shadcn/ui in Phase 5 before building feature UI.
- Define theme tokens before composing milestone pages.
- Validate all milestone surfaces on desktop and mobile breakpoints as part of phase completion.

## Phase Mapping

| Risk | Address in Phase |
|------|------------------|
| Late theme architecture | Phase 5 |
| Delayed shadcn installation | Phase 5 |
| Runtime mismatch | Phase 5 |
| Weak responsive polish | Phase 6-7 |

---
*Pitfalls research for milestone v1.1*
