-- ===========================================================================
-- ARISE seed data
--
-- GENERATED FILE — do not edit by hand.
-- Regenerate with: npm run seed:generate
-- Source of truth: src/content (questTemplates, lessons, achievements, skills)
--
-- Apply with:  supabase db push   (or paste into the SQL editor)
-- ===========================================================================

begin;

truncate table public.quest_templates restart identity cascade;
truncate table public.achievements cascade;
truncate table public.skill_defs cascade;
truncate table public.lesson_defs cascade;

-- ---------------------------------------------------------------- lessons
-- XP rewards must be known server-side: the completion RPC refuses lessons
-- that are not seeded here.
insert into public.lesson_defs (id, path_id, title, xp_reward, minutes)
values
  ('linux-01-navigate', 'linux-fundamentals', 'Navigating the Filesystem', 25, 12),
  ('linux-02-files', 'linux-fundamentals', 'Creating, Moving and Deleting Files', 25, 12),
  ('linux-03-pipes', 'linux-fundamentals', 'Pipes, Redirection and grep', 30, 15),
  ('fs-01-permissions', 'filesystems', 'Understanding rwx Permissions', 30, 14),
  ('fs-02-chmod-chown', 'filesystems', 'chmod, chown and umask in Practice', 30, 13),
  ('proc-01-processes', 'processes', 'Processes, PIDs and Signals', 30, 14),
  ('proc-02-services', 'processes', 'Services and Init Systems', 30, 12),
  ('net-01-model', 'networking', 'IP, Ports, TCP and UDP', 30, 15),
  ('net-02-observe', 'networking', 'Observing Your Network', 30, 14),
  ('proto-01-dns', 'protocols', 'DNS: How Names Become Addresses', 30, 14),
  ('proto-02-http', 'protocols', 'HTTP Requests, Responses and Headers', 30, 15),
  ('proto-03-tls', 'protocols', 'TLS: Why Connections Are Encrypted', 30, 13),
  ('bash-01-anatomy', 'scripting', 'Bash Script Anatomy', 35, 16),
  ('bash-02-control', 'scripting', 'Loops, Conditionals and Arguments', 35, 16),
  ('pyth-01-automation', 'scripting', 'Python for Automation', 35, 18),
  ('sec-01-threat-model', 'defensive', 'Threat Modeling for Ordinary Systems', 35, 15),
  ('sec-02-secrets', 'defensive', 'Secrets, Passwords and MFA', 35, 13),
  ('sec-03-hardening', 'defensive', 'Hardening Basics', 35, 14),
  ('lab-01-enumerate', 'labs', 'Lab: Enumerate Your Own Machine', 40, 25),
  ('lab-02-vulnerable-env', 'labs', 'Lab: Practice in Intentionally Vulnerable Environments', 40, 20)
;

-- ---------------------------------------------------------------- quests
insert into public.quest_templates
  (id, title, description, path, difficulty, cadence, duration_minutes,
   instructions, criteria, xp_reward, min_level, requires_skills, tags,
   confirm_required, attribute_weights, challenge)
values
  ('v-wall-pushups', 'Wall Push-Up Primer', 'Rehearse the pushing pattern against a wall with full control.', 'vitality', 'easy', 'daily', 8, '["Stand one arm-length from a wall, hands at shoulder height.","Perform 3 sets of 8–12 slow reps: 2 seconds down, 1 second pause, drive away.","Keep ribs stacked over hips — no sagging or shrugging."]', '["3 sets completed with clean form","No shoulder pain during or after","Rest 45–60 s between sets"]', null, 1, null, array['push', 'beginner']::text[], false, '{"strength":0.7,"mobility":0.2,"discipline":0.1}', false),
  ('v-incline-pushups', 'Incline Push-Up Progression', 'Build pressing strength on a stable incline surface.', 'vitality', 'medium', 'daily', 15, '["Choose a surface (bench, table, counter) that makes the set challenging but achievable.","4 sets of 5–10 reps, chest to the surface, elbows at ~45°.","Rest 60–90 s between sets."]', '["4 sets completed","Body in one straight line throughout","Stopped 1–2 reps before failure"]', null, 1, null, array['push', 'strength']::text[], false, '{"strength":0.75,"endurance":0.15,"discipline":0.1}', false),
  ('v-squats', 'Bodyweight Squat Fundamentals', 'Own the deepest squat you can control.', 'vitality', 'easy', 'daily', 10, '["3 sets of 10–15 squats, 3 s lowering phase.","Heels planted, knees tracking over toes, chest proud.","Pause 1 s at the bottom of each rep."]', '["3 sets completed","Full depth you can control","No knee or back pain"]', null, 1, null, array['legs', 'beginner']::text[], false, '{"strength":0.5,"mobility":0.3,"discipline":0.2}', false),
  ('v-split-squat', 'Single-Leg Strength — Split Squat', 'Train each leg independently to expose and fix imbalances.', 'vitality', 'hard', 'daily', 18, '["3 sets of 6–10 reps per leg, rear foot elevated or flat.","Lower until the rear knee lightly kisses the floor.","Rest 90 s between legs."]', '["3 sets per leg","Controlled tempo on every rep","No balance-saving jerks"]', null, 4, null, array['legs', 'strength']::text[], false, '{"strength":0.8,"discipline":0.2}', false),
  ('v-mobility-flow', 'Full-Body Mobility Flow', 'Ten minutes of controlled end-range work for hips, spine and shoulders.', 'vitality', 'easy', 'daily', 10, '["Cat–cow × 10, world’s greatest stretch × 5 per side.","90/90 hip switches × 8, thoracic openers × 8 per side.","Deep squat hold 3 × 30 s with relaxed breathing."]', '["All movements completed","Breathing stayed slow","No forcing through pain"]', null, 1, null, array['mobility', 'recovery']::text[], false, '{"mobility":0.8,"discipline":0.2}', false),
  ('v-hip-reset', 'Hip Mobility Reset', 'Undo desk posture with targeted hip capsule and hamstring work.', 'vitality', 'easy', 'daily', 8, '["Half-kneeling hip flexor stretch 2 × 45 s per side.","Supine hamstring floss × 10 per leg.","Frog rock-backs × 10."]', '["Both sides trained equally","Tempo stayed controlled"]', null, 1, null, array['mobility']::text[], false, '{"mobility":0.9,"discipline":0.1}', false),
  ('v-plank', 'Core Time Under Tension', 'Build bracing endurance with long, honest planks.', 'vitality', 'easy', 'daily', 8, '["3 plank holds of 30–60 s (forearms or hands).","Squeeze glutes, tuck the pelvis slightly, breathe through the nose.","End each set when form breaks, not when it burns."]', '["3 holds completed","Straight line from head to heels"]', null, 1, null, array['core', 'beginner']::text[], false, '{"strength":0.6,"discipline":0.4}', false),
  ('v-hinge', 'Hip Hinge & Posterior Chain', 'Learn to load the hips instead of the lower back.', 'vitality', 'medium', 'daily', 12, '["Dead-bug or good-morning prep × 10.","3 sets of 10 slow hip hinges (doorframe row or backpack RDL).","Finish with 2 × 30 s glute bridges."]', '["Neutral spine on every rep","Hips initiated the movement"]', null, 1, null, array['strength', 'posterior']::text[], false, '{"strength":0.7,"mobility":0.2,"discipline":0.1}', false),
  ('v-pull', 'Scapular Pulls & Doorframe Rows', 'Balance all that pushing with real pulling volume.', 'vitality', 'medium', 'daily', 14, '["Scapular pulls: 3 × 8 from a dead hang or bar hang.","Doorframe rows: 3 × 10, squeeze shoulder blades for 1 s.","Rest 60 s between sets."]', '["3 sets of each movement","Shoulder blades moved first on every row"]', null, 2, null, array['pull', 'strength']::text[], false, '{"strength":0.8,"discipline":0.2}', false),
  ('v-zone2', 'Zone-2 Endurance Block', 'Conversational-pace cardio that builds your aerobic base.', 'vitality', 'medium', 'daily', 25, '["Pick brisk walking, cycling, rowing or swimming.","25 minutes at a pace where you can still speak in full sentences.","Keep heart rate in the easy zone; stop the clock if it spikes."]', '["25 minutes completed","Pace stayed genuinely easy","No next-day collapse"]', null, 1, null, array['endurance']::text[], false, '{"endurance":0.8,"discipline":0.2}', false),
  ('v-intervals', 'Run/Walk Intervals', 'Introduce hard efforts safely with structured work and rest.', 'vitality', 'hard', 'daily', 20, '["5-minute easy warm-up.","6 rounds: 60 s hard effort / 90 s easy walk.","5-minute cool-down walk."]', '["All 6 rounds completed","Hard intervals were genuinely hard","Full cool-down"]', null, 3, null, array['endurance', 'hard']::text[], false, '{"endurance":0.85,"discipline":0.15}', false),
  ('v-locomotion', 'Animal-Flow Locomotion', 'Coordinate the whole body with crawling patterns.', 'vitality', 'medium', 'daily', 15, '["Bear crawl 4 × 10 m, crab walk 4 × 10 m.","Add lizard crawls or duck walks if space allows.","Move quietly — control beats speed."]', '["8 total lengths completed","Knees hovering, hips level on crawls"]', null, 2, null, array['mobility', 'coordination']::text[], false, '{"strength":0.4,"mobility":0.4,"endurance":0.2}', false),
  ('v-recovery', 'Recovery Protocol — Breath & Stretch', 'A deliberate down-regulation session. Rest counts as training.', 'vitality', 'easy', 'daily', 10, '["5 minutes of slow nasal breathing (4 s in, 6 s out).","Gentle full-body stretch: 45 s per position, 6 positions.","Note how the body feels compared to yesterday."]', '["10 minutes completed without screens","Breathing stayed slow and nasal"]', null, 1, null, array['recovery', 'mobility']::text[], false, '{"mobility":0.6,"discipline":0.4}', false),
  ('v-log-session', 'Log Today’s Training & Reflect', 'Record a completed session with honest notes on performance.', 'vitality', 'easy', 'daily', 6, '["Open Training and log the session you actually did.","Add sets/reps or duration plus one sentence on how it felt.","Flag anything that hurt so future you can see the pattern."]', '["Session recorded with duration","At least one honest note"]', null, 1, null, array['logging', 'reflection']::text[], true, '{"discipline":0.6,"strength":0.2,"endurance":0.1,"mobility":0.1}', false),
  ('v-weekly-volume', 'Weekly Vitality Challenge — Movement Volume', 'Stack three training days and one dedicated mobility day this week.', 'vitality', 'hard', 'weekly', 60, '["Complete 3 training sessions on separate days.","Add 1 mobility-only session.","Log every session before the week ends."]', '["3 training sessions logged","1 mobility session logged","All sessions recorded"]', 150, 1, null, array['challenge', 'weekly']::text[], false, '{"strength":0.4,"endurance":0.3,"mobility":0.2,"discipline":0.1}', true),
  ('i-five-commands', 'Learn Five Essential Linux Commands', 'Pick five everyday commands and use each one for real.', 'intelligence', 'medium', 'daily', 20, '["Study `ls`, `cd`, `grep`, `chmod` and `ps` (or swap in five of your own).","Run each command at least twice with different arguments.","Write one line in your own words explaining what each one does."]', '["5 commands exercised in a real terminal","One-line explanation per command"]', null, 1, null, array['linux', 'cli']::text[], false, '{"technical":0.7,"problemSolving":0.3}', false),
  ('i-permissions', 'Explain File Permissions Out Loud', 'If you cannot explain rwx to a beginner, you do not own it yet.', 'intelligence', 'medium', 'daily', 15, '["Run `ls -l` on a directory and decode one permission string (e.g. `-rwxr-xr--`).","Explain owner, group and other bits, plus what `x` means for directories.","Show one `chmod` change and revert it."]', '["Decoded a real permission string","Performed and reverted a chmod change"]', null, 1, null, array['linux', 'permissions']::text[], false, '{"technical":0.75,"problemSolving":0.25}', false),
  ('i-man-page', 'Read One Man Page End-to-End', 'Learn a tool from its primary source instead of a random snippet.', 'intelligence', 'easy', 'daily', 10, '["Pick a command you use casually (`tar`, `find`, `curl`, `sed`).","Read NAME, SYNOPSIS and at least three options in depth.","Try two options you have never used."]', '["Man page read","Two new options tried in practice"]', null, 1, null, array['linux', 'docs']::text[], false, '{"technical":0.8,"discipline":0.2}', false),
  ('i-pipes', 'Pipeline Practice: grep · awk · sort · uniq', 'Turn a messy text file into an answer with one pipeline.', 'intelligence', 'medium', 'daily', 20, '["Take any log or list on your machine.","Build a pipeline that filters, transforms and aggregates it.","Explain what each stage contributes to the final output."]', '["A working multi-stage pipeline","Stage-by-stage explanation written down"]', null, 1, null, array['linux', 'text-processing']::text[], false, '{"technical":0.5,"problemSolving":0.5}', false),
  ('i-net-config', 'Inspect Local Network Configuration', 'See what your machine actually uses to reach the network.', 'intelligence', 'medium', 'daily', 15, '["Linux: `ip addr` and `ip route`. Windows: `ipconfig` and `route print`.","Identify your default gateway and primary address.","Note which interface carries your traffic and why."]', '["Configuration command run","Gateway and address identified","One observation recorded"]', null, 1, null, array['networking']::text[], false, '{"technical":0.6,"problemSolving":0.4}', false),
  ('i-net-basics', 'Practice Networking Fundamentals', 'Connect the vocabulary of IP, port, protocol and socket.', 'intelligence', 'medium', 'daily', 20, '["Define IP address, port, TCP and UDP in your own words.","Map a real connection (your browser to a site) onto those four terms.","Answer: what happens between the two that fails?"]', '["Four terms defined in your own words","A real connection mapped to them"]', null, 1, null, array['networking']::text[], false, '{"technical":0.6,"problemSolving":0.4}', false),
  ('i-dns-http', 'Trace a DNS + HTTP Request', 'Follow what happens between typing a URL and receiving a page.', 'intelligence', 'medium', 'daily', 20, '["Resolve a domain with `dig` or `nslookup` and read the answer.","Inspect a response with `curl -I https://example.com`.","Write the sequence: DNS → TCP → TLS → HTTP → response."]', '["DNS lookup performed","HTTP headers inspected","Sequence written in order"]', null, 2, null, array['networking', 'web']::text[], false, '{"technical":0.55,"problemSolving":0.45}', false),
  ('i-processes', 'Inspect Running Processes', 'Learn what is consuming your system and how it is managed.', 'intelligence', 'medium', 'daily', 15, '["List processes with `ps aux` or `htop` and sort by CPU or memory.","Identify one process you did not know was running.","Look up its service name and purpose."]', '["Process list inspected","One unfamiliar process identified and researched"]', null, 1, null, array['linux', 'processes']::text[], false, '{"technical":0.6,"problemSolving":0.4}', false),
  ('i-debug', 'Debug One Error Properly', 'Read the whole message, form a hypothesis, test it once.', 'intelligence', 'medium', 'daily', 18, '["Take an error you hit today (build, command, config).","Write down: what you expected, what happened, the exact message.","Form one hypothesis, test it, and record the outcome — even a failed one."]', '["Error captured verbatim","Hypothesis written before testing","Outcome recorded"]', null, 1, null, array['debugging', 'method']::text[], false, '{"problemSolving":0.75,"technical":0.25}', false),
  ('i-doc-finding', 'Document a Technical Finding', 'Write a short, reusable note about something you learned.', 'intelligence', 'easy', 'daily', 15, '["Pick one thing you learned in the last 24 hours.","Write 6–10 lines: context, what you found, why it matters, how to reproduce.","Include the exact command or snippet you used."]', '["Note written with context + reproducible steps","Command or snippet included"]', null, 1, null, array['writing', 'knowledge']::text[], false, '{"technical":0.5,"discipline":0.5}', false),
  ('i-secrets-audit', 'Password & Secrets Hygiene Audit', 'Check your own accounts and configs for sloppy secrets.', 'intelligence', 'easy', 'daily', 12, '["Check whether any password is reused across two services.","Confirm no API key is committed in a repo you control.","Turn on multi-factor authentication on one account that lacks it."]', '["Reuse checked","Repository scanned for secrets","One MFA upgrade completed"]', null, 1, null, array['security', 'hygiene']::text[], false, '{"technical":0.7,"discipline":0.3}', false),
  ('i-bash-script', 'Write a 10-Line Bash Script', 'Automate something you did by hand this week.', 'intelligence', 'hard', 'daily', 30, '["Pick a repetitive task (backup a folder, rename files, summarize a log).","Write a script with `set -euo pipefail`, a variable and a loop.","Run it, break it on purpose, and fix it."]', '["Script runs end-to-end","Includes error handling","Tested against a small input"]', null, 3, null, array['scripting', 'bash']::text[], false, '{"technical":0.5,"problemSolving":0.5}', false),
  ('i-python-task', 'Automate One Task in Python', 'Solve a real, small problem with a real script.', 'intelligence', 'hard', 'daily', 35, '["Define a concrete input and the output you want.","Write functions with names that describe the work.","Test with one normal case and one edge case."]', '["Script solves the stated problem","Edge case handled","Code reviewed by you"]', null, 4, null, array['scripting', 'python']::text[], false, '{"technical":0.45,"problemSolving":0.55}', false),
  ('i-academy-lesson', 'Complete One Academy Lesson', 'Finish a lesson and pass its knowledge check.', 'intelligence', 'easy', 'daily', 20, '["Open the Academy and pick the next uncompleted lesson.","Read it fully, then do the practical exercise.","Pass the quiz with 70% or better."]', '["Lesson completed","Quiz score ≥ 70%"]', null, 1, null, array['academy']::text[], false, '{"technical":0.7,"problemSolving":0.3}', false),
  ('i-weekly-build', 'Weekly Intelligence Challenge — Build & Document', 'Ship one small technical artifact and write it up.', 'intelligence', 'hard', 'weekly', 90, '["Build something small but complete (script, config, diagram, lab).","Write a short README-style summary of what it does.","Note one thing you would improve next time."]', '["Artifact completed","Written summary published somewhere you keep notes"]', 150, 1, null, array['challenge', 'weekly']::text[], false, '{"technical":0.5,"problemSolving":0.4,"discipline":0.1}', true),
  ('d-focus-25', 'Complete a 25-Minute Focus Session', 'One task, no tabs, timer running.', 'discipline', 'medium', 'daily', 25, '["Choose one concrete task you can finish or advance in 25 minutes.","Silence notifications and close unrelated tabs.","Start the focus timer; do not stop it early."]', '["25 minutes logged in the focus timer","One task only"]', null, 1, null, array['focus']::text[], false, '{"discipline":1}', false),
  ('d-deep-work', '90-Minute Deep Work Sprint', 'A full work block on the hardest thing you have.', 'discipline', 'hard', 'daily', 90, '["Pick your single most valuable task.","90 minutes with a defined stopping point written down first.","End by writing the next concrete action for tomorrow."]', '["90 minutes completed","Stopping point defined up front","Next action written"]', null, 3, null, array['focus', 'deep']::text[], false, '{"discipline":1}', false),
  ('d-reflection', 'Write Your Daily Reflection', 'Four prompts, honest answers, five minutes.', 'discipline', 'easy', 'daily', 8, '["Answer: What did I accomplish? What challenged me? What did I learn? What is my next action?","Keep it honest — the entry is private to you.","Submit it from the Discipline module."]', '["Reflection saved for today","All four prompts answered"]', null, 1, null, array['reflection', 'journal']::text[], false, '{"discipline":1}', false),
  ('d-plan-tomorrow', 'Plan Tomorrow''s Priorities', 'Close the day by deciding what tomorrow actually contains.', 'discipline', 'easy', 'daily', 8, '["Write down tomorrow’s top three outcomes (not tasks — outcomes).","Park everything else on a later list.","Attach each outcome to a time block."]', '["Three outcomes written","Time blocks assigned"]', null, 1, null, array['planning']::text[], false, '{"discipline":1}', false),
  ('d-shutdown', 'Evening Shutdown Ritual', 'End the workday deliberately instead of drifting off.', 'discipline', 'easy', 'daily', 6, '["Review what got done and what did not.","Capture every open loop in one list.","Say a literal stopping point out loud or in writing."]', '["Open loops captured","Stopping point declared"]', null, 1, null, array['planning', 'recovery']::text[], false, '{"discipline":1}', false),
  ('d-phone-free', 'Phone-Free First Hour', 'Start the day on your terms, not a feed’s.', 'discipline', 'easy', 'daily', 60, '["Keep the phone out of reach for the first 60 minutes after waking.","Use the time for planning, movement or reading.","Note the urge to check when it appears."]', '["60 minutes without opening social feeds","One observation about the urge noted"]', null, 1, null, array['focus', 'habit']::text[], false, '{"discipline":1}', false),
  ('d-skill-drill', 'Deliberate Practice on One Weak Skill', 'Practice the specific weak point, not the comfortable part.', 'discipline', 'medium', 'daily', 25, '["Identify one specific thing you currently do badly.","Design a drill that isolates it.","Repeat with feedback for 20+ minutes; record what improved."]', '["Drill isolated one weakness","20+ minutes of repetitions","Result recorded"]', null, 1, null, array['practice']::text[], false, '{"discipline":0.8,"problemSolving":0.2}', false),
  ('d-time-audit', 'Time Audit — Track Your Hours', 'Measure where the day actually goes before judging it.', 'discipline', 'medium', 'daily', 15, '["Log your last 8 waking hours in rough blocks.","Mark which blocks produced something real.","Name the single biggest leak."]', '["8 hours accounted for","Productive blocks marked","Biggest leak named"]', null, 1, null, array['planning', 'awareness']::text[], false, '{"discipline":0.7,"problemSolving":0.3}', false),
  ('d-weekly-review', 'Weekly Progress Review', 'Look at the data honestly and adjust one thing.', 'discipline', 'medium', 'daily', 20, '["Review quest completion, workouts and lessons for the week.","Name one thing that worked and one that did not.","Change exactly one variable for next week."]', '["Numbers reviewed","One success and one failure named","One change committed"]', null, 1, null, array['review']::text[], false, '{"discipline":1}', false),
  ('d-commitment-cut', 'Cut One Low-Value Commitment', 'Make space by removing something that does not matter.', 'discipline', 'easy', 'daily', 10, '["List your current recurring commitments.","Pick one that serves nobody’s real goals — including yours.","Decline, postpone or delegate it today."]', '["Commitment list written","One item cut or scheduled to end"]', null, 1, null, array['clarity']::text[], false, '{"discipline":1}', false),
  ('d-weekly-perfect', 'Weekly Discipline Challenge — The Perfect Week', 'Finish the week with most daily quests done and three reflections written.', 'discipline', 'medium', 'weekly', 60, '["Complete at least 80% of this week’s daily quests.","Write reflections on three separate days.","Run one weekly review before the week ends."]', '["≥80% of weekly quests completed","3 reflection days","Weekly review done"]', 100, 1, null, array['challenge', 'weekly']::text[], false, '{"discipline":1}', true)
;

-- ---------------------------------------------------------- achievements
-- Rules are stored for documentation and future server-side evaluation;
-- arise_evaluate_progress() mirrors src/core/achievements.ts exactly.
insert into public.achievements (id, name, description, icon, xp_reward, attribute_weights, rule)
values
  ('first_awakening', 'First Awakening', 'Complete your very first quest.', 'Sparkles', 25, '{"discipline":1}', '{"kind":"completedQuests","target":1}'),
  ('consistency_begins', 'Consistency Begins', 'Complete quests on three separate days.', 'CalendarCheck', 25, '{"discipline":1}', '{"kind":"activeDays","target":3}'),
  ('body_in_motion', 'Body in Motion', 'Log five training sessions.', 'Dumbbell', 50, '{"strength":0.5,"endurance":0.4,"mobility":0.1}', '{"kind":"workouts","target":5}'),
  ('terminal_initiate', 'Terminal Initiate', 'Complete five Linux-focused Academy lessons.', 'Terminal', 50, '{"technical":0.7,"problemSolving":0.3}', '{"kind":"lessons","target":5,"paths":["linux","fs","proc"]}'),
  ('network_explorer', 'Network Explorer', 'Pass a networking knowledge check with 80% or better.', 'Network', 50, '{"technical":0.5,"problemSolving":0.5}', '{"kind":"quizPassed","pathPrefix":"net","minScore":80}'),
  ('discipline_protocol', 'Discipline Protocol', 'Write five daily reflections.', 'NotebookPen', 50, '{"discipline":1}', '{"kind":"reflections","target":5}'),
  ('balanced_hunter', 'Balanced Hunter', 'Complete five quests in each of the three development paths.', 'Scale', 75, '{"discipline":0.4,"technical":0.3,"strength":0.3}', '{"kind":"balanced","target":5}'),
  ('streak_spark', 'Streak of Will', 'Hold a 7-day active streak.', 'Flame', 75, '{"discipline":1}', '{"kind":"streak","target":7}'),
  ('focus_master', 'Deep Focus Protocol', 'Bank 300 minutes of completed focus sessions.', 'Timer', 75, '{"discipline":1}', '{"kind":"focusMinutes","target":300}'),
  ('challenge_crusher', 'Challenge Crusher', 'Complete three weekly challenges.', 'Trophy', 100, '{"discipline":0.5,"strength":0.25,"technical":0.25}', '{"kind":"challenges","target":3}'),
  ('academy_scholar', 'Academy Scholar', 'Complete ten Academy lessons.', 'GraduationCap', 100, '{"technical":0.7,"problemSolving":0.3}', '{"kind":"lessons","target":10}'),
  ('iron_will', 'Iron Will', 'Log twenty training sessions.', 'BicepsFlexed', 100, '{"strength":0.5,"endurance":0.4,"mobility":0.1}', '{"kind":"workouts","target":20}'),
  ('goal_setter', 'Objective Locked', 'Complete a declared development goal.', 'Target', 25, '{"discipline":1}', '{"kind":"goalsCompleted","target":1}')
;

-- -------------------------------------------------------------- skill defs
insert into public.skill_defs (id, path, column_index, row_index, prerequisites, measure)
values
  ('v-move-foundation', 'vitality', 0, 0, array[]::text[], '{"kind":"workouts","target":2}'),
  ('v-push-pattern', 'vitality', 0, 1, array['v-move-foundation']::text[], '{"kind":"quests","path":"vitality","target":3}'),
  ('v-engine', 'vitality', 1, 1, array['v-move-foundation']::text[], '{"kind":"attribute","attribute":"endurance","target":20}'),
  ('v-supple', 'vitality', 2, 1, array['v-move-foundation']::text[], '{"kind":"attribute","attribute":"mobility","target":20}'),
  ('v-strength-base', 'vitality', 0, 2, array['v-push-pattern']::text[], '{"kind":"attribute","attribute":"strength","target":35}'),
  ('v-consistency', 'vitality', 1, 2, array['v-engine']::text[], '{"kind":"workouts","target":10}'),
  ('v-intermediate', 'vitality', 0, 3, array['v-strength-base', 'v-consistency']::text[], '{"kind":"quests","path":"vitality","target":15}'),
  ('v-program-architect', 'vitality', 0, 4, array['v-intermediate']::text[], '{"kind":"attribute","attribute":"strength","target":60}'),
  ('i-shell-basics', 'intelligence', 0, 0, array[]::text[], '{"kind":"lessons","paths":["linux"],"target":1}'),
  ('i-permissions-mastery', 'intelligence', 0, 1, array['i-shell-basics']::text[], '{"kind":"lessons","paths":["linux","fs"],"target":3}'),
  ('i-processes', 'intelligence', 1, 1, array['i-shell-basics']::text[], '{"kind":"lessons","paths":["proc"],"target":1}'),
  ('i-networking', 'intelligence', 0, 2, array['i-permissions-mastery']::text[], '{"kind":"lessons","paths":["net"],"target":2}'),
  ('i-scripting', 'intelligence', 1, 2, array['i-processes']::text[], '{"kind":"attribute","attribute":"technical","target":40}'),
  ('i-defense', 'intelligence', 0, 3, array['i-networking']::text[], '{"kind":"lessons","paths":["sec"],"target":2}'),
  ('i-labs', 'intelligence', 1, 3, array['i-defense', 'i-scripting']::text[], '{"kind":"quests","path":"intelligence","target":10}'),
  ('i-analyst', 'intelligence', 2, 2, array['i-networking']::text[], '{"kind":"attribute","attribute":"problemSolving","target":55}'),
  ('d-habit-foundation', 'discipline', 0, 0, array[]::text[], '{"kind":"journal","target":3}'),
  ('d-focus-blocks', 'discipline', 1, 1, array['d-habit-foundation']::text[], '{"kind":"focusMinutes","target":60}'),
  ('d-reflection-practice', 'discipline', 0, 1, array['d-habit-foundation']::text[], '{"kind":"journal","target":10}'),
  ('d-time-mastery', 'discipline', 0, 2, array['d-reflection-practice']::text[], '{"kind":"attribute","attribute":"discipline","target":35}'),
  ('d-unwavering', 'discipline', 1, 2, array['d-focus-blocks']::text[], '{"kind":"streak","target":7}'),
  ('d-deliberate', 'discipline', 0, 3, array['d-time-mastery']::text[], '{"kind":"quests","path":"discipline","target":15}'),
  ('d-self-directed', 'discipline', 0, 4, array['d-deliberate', 'd-unwavering']::text[], '{"kind":"streak","target":30}')
;

commit;

-- Verification hints (safe to run afterwards):
--   select count(*) from public.quest_templates;  -- expect 41
--   select count(*) from public.lesson_defs;      -- expect 20
--   select count(*) from public.achievements;     -- expect 13
--   select count(*) from public.skill_defs;       -- expect 23
