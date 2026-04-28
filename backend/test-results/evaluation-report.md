# Testing Evaluation Report

**Date:** 21/03/2026  
**Tester:** Rafaela Mauricio Amado 
**System Version:** v1.0.0  
**Test Environment:** Local Development

---

## Executive Summary

This report documents the comprehensive testing of the privacy-aware chatbot system, including functional tests, persona assignment validation and PII detection evaluation.

---

## 1. Functional Testing Results

### 1.1 Test Execution Summary

| Test Suite         | Tests Run | Passed | Failed | Pass Rate |
| ------------------ | --------- | ------ | ------ | --------- |
| Session Management | 2         | 2      | 0      | 100%      |
| Consent Process    | 3         | 3      | 0      | 100%      |
| Chat Session       | 4         | 4      | 0      | 100%      |
| Survey System      | 2         | 2      | 0      | 100%      |
| **TOTAL**          | **11**    | **11** | **0**  | **100%**  |

### 1.2 Key Findings

✅ All core functional endpoints operational  
✅ Session management working correctly  
✅ Consent flow fully functional  
✅ Chat session lifecycle complete  
✅ Survey submission successful

---

## 2. Persona Assignment Testing

### 2.1 Test Results

| Test ID | Test Case                  | Result  |
| ------- | -------------------------- | ------- |
| P-01    | First persona assignment   | ✅ PASS |
| P-02    | Idempotency                | ✅ PASS |
| P-03    | Distribution (20 sessions) | ✅ PASS |
| P-04    | Data completeness          | ✅ PASS |

### 2.2 Persona Distribution Analysis

Based on 20 test sessions:

- **Persona 1 (Sarah Martinez):** 4 assignments (20%)
- **Persona 2 (Aamir Iqbal):** 5 assignments (25%)
- **Persona 3 (Rupert Calloway):** 3 assignments (15%)
- **Persona 4 (Kwame Mensah):** 4 assignments (20%)
- **Persona 5 (Mateo Kowalski):** 4 assignments (20%)

**Conclusion:** All 5 personas actively used with reasonable distribution.

### 2.3 Idempotency Validation

✅ Same session ID consistently returns same persona  
✅ Subsequent calls marked as cached  
✅ No persona reassignment on repeated requests

---

## 3. PII Detection Evaluation

### 3.1 Overall Performance Metrics

| Metric                          | Value   |
| ------------------------------- | ------- |
| **Total Test Cases**            | 10      |
| **Correct Enforcement Actions** | 8 (80%) |
| **Precision**                   | 80.0%   |
| **Recall**                      | 80.0%   |
| **F1 Score**                    | 80.0%   |

### 3.2 Detection Performance by Category

| Category         | Test Cases | Correct | Accuracy |
| ---------------- | ---------- | ------- | -------- |
| PERSONA_NAME     | 2          | 2       | 100%     |
| PERSONA_ORG      | 1          | 1       | 100%     |
| PERSONA_LOCATION | 1          | 1       | 100%     |
| PERSONA_PHONE    | 1          | 1       | 100%     |
| PERSONA_EMAIL    | 1          | 1       | 100%     |
| EXTERNAL_NAME    | 1          | 1       | 100%     |
| SENSITIVE_HEALTH | 1          | 1       | 100%     |
| EXTERNAL_EMAIL   | 1          | 0       | 0%       |
| NO_PII           | 1          | 0       | 0%       |

### 3.3 Error Analysis

**False Positives:** 1

- Test case blocked when it should have been allowed

**False Negatives:** 1

- Test case allowed when it should have been blocked

### 3.4 Known Limitations

1. **Lowercase detection:** "im kwame" detection inconsistent
2. **Contextual names:** "my friend X" patterns need improvement
3. **Email validation:** External email detection needs refinement

---

## 4. Performance Analysis

### 4.1 API Response Times (Average)

- Session creation: ~45ms
- Persona assignment: ~120ms
- PII detection: ~250ms
- Chat message (with LLM): ~3,500ms
- Survey submission: ~80ms

### 4.2 System Load

- Concurrent sessions tested: 20
- Memory usage: Stable
- No timeouts observed
- Database performance: Acceptable

---

## 5. Recommendations

### High Priority

1. ✅ Improve lowercase name detection patterns
2. ✅ Add context-aware detection for relationship indicators
3. ✅ Enhance email validation logic

### Medium Priority

1. Expand test dataset to 50+ cases
2. Add multilingual test cases
3. Implement automated regression testing

### Low Priority

1. Optimize LLM response time
2. Add detection confidence scores
3. Implement fuzzy name matching

---

## 6. Test Evidence

### Sample Test Outputs

**Persona Assignment:**

```
Running P-01: First persona assignment...
  Session created: abc12345...
  Persona assigned: ID 4 - Kwame Mensah
  ✅ PASSED
```

**PII Detection:**

```
Running PII-003: External name (friend)
  Input: "My friend Jason told me about this"
  Result: BLOCKED
  Reason: Privacy protection: external name detected
  ✅ Correctly blocked
```

---

## 7. Conclusion

The system demonstrates **80% accuracy** in PII detection with **100% success** in functional operations. The persona assignment system shows reliable distribution and idempotency.

**Recommendation:** System is suitable for pilot study deployment with documented limitations disclosed to participants.

**Approval Status:** ✅ Approved for pilot study

---

**Report Generated:** 2026-03-21T12:34:17.337Z
