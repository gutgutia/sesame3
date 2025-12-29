# School Research Prompt for Claude/ChatGPT

Use this prompt with Claude (with web access) or ChatGPT (with browsing) to gather comprehensive data for the top 50 schools.

---

## Prompt to Use:

```
I need you to research comprehensive admissions data for the following universities for the 2025-2026 application cycle (Fall 2026 enrollment). For each school, please provide:

## Data to Collect for Each School:

### 1. Basic Stats (verify latest available)
- Acceptance rate (overall)
- SAT 25th-75th percentile range
- ACT 25th-75th percentile range
- Undergraduate enrollment
- In-state tuition (for publics) / Tuition (for privates)
- Room & board cost
- Average financial aid package

### 2. Application Deadlines (2025-2026 cycle)
- Early Decision deadline (if offered)
- Early Decision II deadline (if offered)
- Early Action deadline (if offered)
- Restrictive Early Action deadline (if offered)
- Regular Decision deadline
- Priority deadline (if applicable)
- Financial Aid priority deadline (CSS Profile/FAFSA)

### 3. Admission Type Details
- Does the school offer ED? (binding)
- Does the school offer ED2? (binding, later round)
- Does the school offer EA? (non-binding)
- Is it Restrictive EA (SCEA/REA)?
- Does it have rolling admissions?
- Any special notes about the admissions process?

### 4. Rich Context (for AI advisor)
Please provide a detailed paragraph (100-200 words) covering:
- What makes this school unique/distinctive
- Academic strengths and popular majors
- Campus culture and student life vibe
- Geographic/location considerations
- Financial aid policies (need-blind? meets 100% need?)
- Any "insider tips" for applicants
- What type of student typically thrives here
- Acceptance rate trends or recent changes
- Notable facts applicants should know

## Schools to Research (50 total):

### Ivy League (8)
1. Harvard University
2. Yale University
3. Princeton University
4. Columbia University
5. University of Pennsylvania
6. Brown University
7. Dartmouth College
8. Cornell University

### Top Private (Non-Ivy) (22)
9. Stanford University
10. MIT
11. Caltech
12. Duke University
13. Northwestern University
14. University of Chicago
15. Johns Hopkins University
16. Rice University
17. Vanderbilt University
18. Notre Dame
19. Washington University in St. Louis
20. Georgetown University
21. Emory University
22. Carnegie Mellon University
23. USC
24. NYU
25. Tufts University
26. Boston College
27. Boston University
28. Case Western Reserve University
29. Northeastern University
30. Wake Forest University

### Top Public Universities (12)
31. UC Berkeley
32. UCLA
33. University of Michigan
34. University of Virginia
35. UNC Chapel Hill
36. Georgia Tech
37. UT Austin
38. University of Wisconsin-Madison
39. UIUC
40. University of Florida
41. Ohio State University
42. University of Washington

### Top Liberal Arts (8)
43. Williams College
44. Amherst College
45. Swarthmore College
46. Pomona College
47. Wellesley College
48. Bowdoin College
49. Middlebury College
50. Claremont McKenna College

## Output Format:

For each school, provide data in this exact format:

---

# [School Number]. [School Name]
**Website:** [admissions website URL]

## Stats
- **Acceptance Rate:** X%
- **SAT Range:** XXXX-XXXX
- **ACT Range:** XX-XX
- **Undergrad Enrollment:** X,XXX
- **Tuition:** $XX,XXX (note if in-state/out-of-state for publics)
- **Room & Board:** $XX,XXX
- **Avg Financial Aid:** $XX,XXX

## Deadlines (2025-2026 Cycle)
- **ED:** [Date] (if offered)
- **ED2:** [Date] (if offered)
- **EA/REA:** [Date] (if offered, note if restrictive)
- **RD:** [Date]
- **Financial Aid Priority:** [Date]

## Admission Types
- **ED:** Yes/No (binding)
- **ED2:** Yes/No
- **EA:** Yes/No
- **REA/SCEA:** Yes/No
- **Rolling:** Yes/No
- **Notes:** [Any special notes]

## Rich Context
[100-200 word paragraph for AI advisor context]

---

Please research all 50 schools thoroughly. Use official school websites for the most accurate deadline information. Stats can come from Common Data Sets, IPEDS, or school websites.
```

---

## After Research

Once you have the research, push it to `docs/school-research.md` and I'll process it into the seed file, similar to what we did for summer programs.

## College Scorecard API (Optional)

For additional stats data, you can also use the College Scorecard API:
- API Docs: https://collegescorecard.ed.gov/data/api/
- Data Dictionary: https://collegescorecard.ed.gov/data/data-documentation/

Key API fields:
- `latest.admissions.admission_rate.overall` - Acceptance rate
- `latest.admissions.sat_scores.25th_percentile.critical_reading_and_math` - SAT 25th
- `latest.admissions.sat_scores.75th_percentile.critical_reading_and_math` - SAT 75th
- `latest.admissions.act_scores.25th_percentile.cumulative` - ACT 25th
- `latest.admissions.act_scores.75th_percentile.cumulative` - ACT 75th
- `latest.student.size` - Enrollment
- `latest.cost.tuition.in_state` / `latest.cost.tuition.out_of_state` - Tuition
- `latest.cost.avg_net_price.overall` - Avg net cost after aid

API requires a free API key from data.gov.
