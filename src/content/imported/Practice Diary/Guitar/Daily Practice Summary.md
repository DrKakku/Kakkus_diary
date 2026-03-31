---
title: Daily Practice Summary
date: 2026-04-01
tags: []
type: note
---
# Daily Practice Summary

## All sessions

```dataview
TABLE
  practice_date as Date,
  completed_minutes as Minutes,
  status as Status,
  energy as Energy,
  bpm_start as "Start BPM",
  bpm_end as "End BPM",
  techniques_practiced as Techniques,
  songs_practiced as Songs,
  pain_or_tension as Tension
FROM "publish/Practice Diary/Guitar/Daily Practice Tracker"
WHERE type = "guitar_daily_practice"
SORT practice_date DESC
```

```dataviewjs
const folder = "publish/Practice Diary/Guitar/Daily Practice Tracker";  
const pages = dv.pages(`"${folder}"`).where(p => p.type === "guitar_daily_practice");  
  
const totalMinutes = pages.array().reduce(  
(sum, p) => sum + (Number(p.completed_minutes) || 0),  
0  
);  
  
dv.table(  
["Metric", "Value"],  
[  
["Total Minutes Practiced", totalMinutes],  
["Sessions Logged", pages.length]  
]  
);
```


```dataview
TABLE
  practice_date as Date,
  completed_minutes as Minutes,
  techniques_practiced as Techniques,
  songs_practiced as Songs
FROM "publish/Practice Diary/Guitar/Daily Practice Tracker"
WHERE type = "guitar_daily_practice" AND month = dateformat(date(today), "yyyy-MM")
SORT practice_date DESC
```

### Missed days this month


```dataviewjs
const folder = "publish/Practice Diary/Guitar/Daily Practice Tracker";
const pages = dv.pages(`"${folder}"`).where(p => p.type === "guitar_daily_practice");

const today = dv.date("today");
const monthStart = today.startOf("month");

const practiced = new Set(
  pages
    .where(p => p.practice_date)
    .map(p => dv.date(p.practice_date).toFormat("yyyy-MM-dd"))
);

const missed = [];
for (
  let cursor = monthStart;
  cursor.toMillis() <= today.toMillis();
  cursor = cursor.plus({ days: 1 })
) {
  const key = cursor.toFormat("yyyy-MM-dd");
  if (!practiced.has(key)) missed.push(key);
}

dv.table(
  ["Missed Date"],
  missed.map(d => [d])
);
```

