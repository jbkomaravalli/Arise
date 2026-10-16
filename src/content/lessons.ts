import type { LearningLesson } from '@/core/types';

export interface LearningPath {
  id: string;
  title: string;
  summary: string;
  order: number;
  /** One-line "why this matters" shown on the path card. */
  motivation: string;
}

export const LEARNING_PATHS: LearningPath[] = [
  {
    id: 'linux-fundamentals',
    title: 'Linux Command-Line Fundamentals',
    summary: 'Navigate, create and transform files from the terminal.',
    order: 1,
    motivation: 'Every other path in this academy assumes you are comfortable here.',
  },
  {
    id: 'filesystems',
    title: 'Filesystems & Permissions',
    summary: 'Ownership, rwx, and who is allowed to do what.',
    order: 2,
    motivation: 'Misconfigured permissions are one of the most common real-world weaknesses.',
  },
  {
    id: 'processes',
    title: 'Processes & Services',
    summary: 'What is running, how it is controlled, what keeps it alive.',
    order: 3,
    motivation: 'You cannot defend or debug a system you cannot see.',
  },
  {
    id: 'networking',
    title: 'Networking Fundamentals',
    summary: 'Addresses, ports, TCP/UDP and the tools to observe them.',
    order: 4,
    motivation: 'Almost every security question eventually becomes a networking question.',
  },
  {
    id: 'protocols',
    title: 'IP, DNS, HTTP & TLS',
    summary: 'What actually happens when you load a page.',
    order: 5,
    motivation: 'Web traffic is where defenders and attackers spend most of their time.',
  },
  {
    id: 'scripting',
    title: 'Bash & Python Scripting',
    summary: 'Automate the repetitive and make your work reproducible.',
    order: 6,
    motivation: 'Automation is leverage — one script replaces a hundred manual steps.',
  },
  {
    id: 'defensive',
    title: 'Defensive Security Fundamentals',
    summary: 'Threat models, secrets, updates and least privilege.',
    order: 7,
    motivation: 'Defense is a craft: it starts with knowing what you are protecting.',
  },
  {
    id: 'labs',
    title: 'Authorized Hands-On Labs',
    summary: 'Practice on systems you own or are explicitly authorized to test.',
    order: 8,
    motivation: 'Knowledge only becomes skill when you use it against a live target you may touch.',
  },
];

export const LESSONS: LearningLesson[] = [
  /* ---------------------- LINUX FUNDAMENTALS ---------------------- */
  {
    id: 'linux-01-navigate',
    pathId: 'linux-fundamentals',
    order: 1,
    title: 'Navigating the Filesystem',
    summary: 'pwd, ls and cd — plus the difference between absolute and relative paths.',
    objectives: [
      'Move between directories confidently using cd with absolute and relative paths.',
      'Read ls output including hidden files and permissions.',
      'Explain what . and .. refer to.',
    ],
    minutes: 12,
    xpReward: 25,
    sections: [
      {
        heading: 'Where you are determines what you touch',
        body: [
          'The shell always has a "current working directory". Every path you type is resolved relative to that directory unless it starts with a slash. Two commands tell you where you are and what is here.',
          'Hidden files in Linux begin with a dot — they are not secret, just hidden from a plain ls.',
        ],
        code: 'pwd\nls -la\nls -lh /etc   # absolute path: starts at the root',
      },
      {
        heading: 'Moving with intent',
        body: [
          'cd takes you somewhere; two special entries never change: `.` is the current directory and `..` is its parent. Chaining them (`../../var/log`) walks up the tree.',
          'A path starting with `/` is absolute — it always begins at the root. Anything else is relative to where you currently stand, which is why `cat notes.txt` can succeed in one directory and fail in the next.',
        ],
        code: 'cd /var/log\ncd ..            # now in /var\ncd ./log         # back to /var/log\ncd ~             # home directory',
      },
    ],
    exercise:
      'Open a terminal. Run pwd, then create a scratch directory with mkdir ~/scratch, enter it, create a file with touch notes.txt, list it with ls -la, and finally cd .. to confirm you understand where .. takes you.',
    quiz: [
      {
        question: 'You are in /home/you/projects. What does `cd ..` do?',
        options: ['Goes to /home/you/projects/..', 'Goes to /home/you', 'Goes to the home directory', 'Fails'],
        answerIndex: 1,
      },
      {
        question: 'Which listing shows hidden files?',
        options: ['ls -l', 'ls -a', 'ls -h', 'ls /'],
        answerIndex: 1,
      },
      {
        question: 'In `cat /etc/hosts`, what kind of path is /etc/hosts?',
        options: ['Relative path', 'Absolute path', 'Glob pattern', 'Shell builtin'],
        answerIndex: 1,
      },
    ],
    takeaways: [
      'Paths starting with / are absolute; everything else is relative to your current directory.',
      '`.` is here, `..` is the parent, `~` is home.',
      'Hidden files start with a dot — `ls -a` reveals them.',
    ],
  },
  {
    id: 'linux-02-files',
    pathId: 'linux-fundamentals',
    order: 2,
    title: 'Creating, Moving and Deleting Files',
    summary: 'touch, cp, mv, rm and mkdir — plus why rm deserves respect.',
    objectives: [
      'Create, copy, rename and remove files and directories safely.',
      'Use flags deliberately instead of by muscle memory.',
      'Explain why recursive deletion is dangerous.',
    ],
    minutes: 12,
    xpReward: 25,
    sections: [
      {
        heading: 'Everyday file operations',
        body: [
          'mv both renames and moves: the name you give it decides which happens. cp copies. touch creates an empty file or refreshes a timestamp. mkdir creates one directory, mkdir -p creates parents as needed.',
        ],
        code: 'mkdir -p ~/scratch/2026\ntouch ~/scratch/2026/notes.txt\ncp ~/scratch/2026/notes.txt ~/scratch/backup.txt\nmv ~/scratch/backup.txt ~/scratch/2026/notes.bak',
      },
      {
        heading: 'Deletion is final',
        body: [
          '`rm` does not move anything to a trash folder — it unlinks the name immediately. `rm -r` removes directories and everything inside them, and there is no undo.',
          'A useful habit: run destructive commands with `-i` (interactive) first, or use `echo` with a dry run for anything scripted. Deleting the wrong directory has ended more careers than any exploit.',
        ],
        code: 'rm -i old.txt          # asks before removing\nrm -r scratch/         # removes a directory tree — know the path first\nrmdir empty_dir/       # only removes if empty',
      },
    ],
    exercise:
      'Create a nested folder tree under ~/scratch with three levels, add two files, copy one up a level, rename it with mv, then remove the copy with rm -i. Finally remove the whole tree and verify with ls ~.',
    quiz: [
      {
        question: 'Which command removes a non-empty directory?',
        options: ['rmdir', 'rm -r', 'del', 'mv --remove'],
        answerIndex: 1,
      },
      {
        question: 'What does `mv old.txt new.txt` do?',
        options: ['Copies the file', 'Renames the file', 'Deletes old.txt', 'Opens an editor'],
        answerIndex: 1,
      },
      {
        question: 'Why is `rm -r ./` run from $HOME dangerous?',
        options: ['It is slow', 'It deletes everything under home recursively', 'It requires root', 'It only works on empty folders'],
        answerIndex: 1,
      },
    ],
    takeaways: [
      'mv renames *and* moves — same command, two purposes.',
      'rm has no recycle bin; use -i while you are learning.',
      'mkdir -p creates missing parents instead of erroring.',
    ],
  },
  {
    id: 'linux-03-pipes',
    pathId: 'linux-fundamentals',
    order: 3,
    title: 'Pipes, Redirection and grep',
    summary: 'Chain small tools into one that answers a real question.',
    objectives: [
      'Redirect stdout to files with > and >>.',
      'Connect commands with the pipe operator |.',
      'Filter text with grep, head, tail and wc.',
    ],
    minutes: 15,
    xpReward: 30,
    sections: [
      {
        heading: 'Streams, not magic',
        body: [
          'Every command reads from stdin and writes to stdout (and errors to stderr). `>` sends stdout to a file, overwriting it; `>>` appends. `|` sends stdout of one command into stdin of the next.',
          'This design is why Unix tools compose: each program does one job well, and you assemble them.',
        ],
        code: 'ls -la > listing.txt\ncat listing.txt | grep "\\.txt" | wc -l',
      },
      {
        heading: 'The everyday filter chain',
        body: [
          '`grep` searches, `head`/`tail` take the first/last lines, `wc -l` counts lines, `sort` orders them, `uniq -c` collapses repeats with counts. Together they turn a raw log into a fact.',
        ],
        code: "grep 'ERROR' app.log | tail -n 20\nawk '{print $1}' access.log | sort | uniq -c | sort -rn | head",
      },
    ],
    exercise:
      'Generate a sample log with `seq 1 50 | sed "s/^/line /" > sample.log`, then use pipes to answer: how many lines contain numbers ending in 7? Write the pipeline and its output in your notes.',
    quiz: [
      {
        question: 'What is the difference between `>` and `>>`?',
        options: ['> appends, >> overwrites', '> overwrites, >> appends', 'Both overwrite', 'Both append'],
        answerIndex: 1,
      },
      {
        question: 'In `ps aux | grep ssh`, what does the pipe do?',
        options: ['Runs both in background', 'Sends ps output as input to grep', 'Copies output to a file', 'Starts an SSH session'],
        answerIndex: 1,
      },
      {
        question: 'Which command counts matching lines?',
        options: ['wc -l', 'grep -c', 'uniq -c', 'Both A and B work for counting matches'],
        answerIndex: 3,
      },
    ],
    takeaways: [
      '`>` overwrites, `>>` appends.',
      'A pipe feeds one command’s stdout into the next command’s stdin.',
      'grep + sort + uniq + head is the fastest path from raw text to an answer.',
    ],
  },

  /* ---------------------- FILESYSTEMS & PERMISSIONS ---------------------- */
  {
    id: 'fs-01-permissions',
    pathId: 'filesystems',
    order: 1,
    title: 'Understanding rwx Permissions',
    summary: 'Decode -rwxr-xr-- and know exactly who can do what.',
    objectives: [
      'Read the ten-character permission string from ls -l.',
      'Separate owner, group and other permissions.',
      'Explain what execute means for files versus directories.',
    ],
    minutes: 14,
    xpReward: 30,
    sections: [
      {
        heading: 'Ten characters, four facts',
        body: [
          'The first character is the type (`-` file, `d` directory, `l` link). The next nine are three triples: owner, group, others — each r (read=4), w (write=2), x (execute=1).',
          'So `-rwxr-xr--` means the owner can read/write/execute, the group can read+execute, everyone else can only read. Numeric: 754.',
        ],
        code: 'ls -l /usr/bin/ls\n# -rwxr-xr-x 1 root root ... /usr/bin/ls   → 755',
      },
      {
        heading: 'Execute means different things',
        body: [
          'On a file, x means "may be run as a program" — a script without x fails with permission denied. On a directory, x means "may enter and traverse it", which is why losing x on a directory breaks your ability to cd into it even if you can list it.',
        ],
        code: 'stat -c "%A %n" ~/scratch/notes.txt\n# -rw-r---- notes.txt  → 644',
      },
    ],
    exercise:
      'Run `ls -l /etc/passwd` and `ls -l /usr/bin/id`. Write down the octal value for each. Then create a file in your scratch directory and confirm its default mode with `stat -c "%a" file`.',
    quiz: [
      {
        question: 'What does -rwxr-x--- mean in octal?',
        options: ['755', '750', '764', '640'],
        answerIndex: 1,
      },
      {
        question: 'What does the x bit do on a directory?',
        options: ['Allows deleting it', 'Allows entering and traversing it', 'Makes it executable as a program', 'Hides it from ls'],
        answerIndex: 1,
      },
      {
        question: 'Which characters in ls -l output represent permissions?',
        options: ['The first character', 'Characters 2–10', 'The last three characters', 'The owner name'],
        answerIndex: 1,
      },
    ],
    takeaways: [
      'First char = type, next nine = owner/group/others triples.',
      'r=4, w=2, x=1 — add them per triple to get octal.',
      'Execute on a directory means "enter", not "run".',
    ],
  },
  {
    id: 'fs-02-chmod-chown',
    pathId: 'filesystems',
    order: 2,
    title: 'chmod, chown and umask in Practice',
    summary: 'Change permissions deliberately and understand the defaults you inherit.',
    objectives: [
      'Set permissions with symbolic (+/-) and octal modes.',
      'Know when chown requires elevated privileges.',
      'Explain what umask controls for new files.',
    ],
    minutes: 13,
    xpReward: 30,
    sections: [
      {
        heading: 'Two ways to set modes',
        body: [
          'Symbolic mode edits specific bits: `chmod u+x script.sh` adds execute for the owner; `chmod go-w file` removes write for group and others. Octal mode replaces everything: `chmod 600 key.txt` means owner read/write, nobody else anything.',
          'Rule of thumb: secrets get 600, shared read-only files 644, programs 755.',
        ],
        code: 'chmod u+x deploy.sh     # make executable for owner\nchmod go-w notes.txt     # remove write from group/others\nchmod 600 ~/.ssh/id_ed25519\nchmod 755 /usr/local/bin/tool',
      },
      {
        heading: 'Ownership and defaults',
        body: [
          '`chown` changes owner (and `:group`), and normally requires root on files you do not own. `umask` is the mask that strips permissions from newly created files — a umask of 022 is why new files arrive as 644 rather than 666.',
        ],
        code: 'umask                 # show current mask\nchown alice:dev file  # requires appropriate privilege\nchgrp dev file        # change group only',
      },
    ],
    exercise:
      'Create a file, make it readable only to you (600), verify with ls -l, then open it up to 644 and confirm the difference. Record what changed and why each setting would be right or wrong for a private key.',
    quiz: [
      {
        question: 'chmod 600 gives which access?',
        options: ['Everyone read/write', 'Owner read/write only', 'Owner read only', 'Owner execute only'],
        answerIndex: 1,
      },
      {
        question: 'What is umask?',
        options: ['A password manager', 'A mask that removes permissions from new files', 'A backup tool', 'A user ID formatter'],
        answerIndex: 1,
      },
      {
        question: 'Which command changes a file’s group?',
        options: ['chmod', 'chgrp', 'umask', 'groups'],
        answerIndex: 1,
      },
    ],
    takeaways: [
      'Symbolic mode edits; octal mode replaces.',
      '600 for secrets, 644 for shared files, 755 for programs.',
      'umask decides the default permissions new files are born with.',
    ],
  },

  /* ---------------------- PROCESSES & SERVICES ---------------------- */
  {
    id: 'proc-01-processes',
    pathId: 'processes',
    order: 1,
    title: 'Processes, PIDs and Signals',
    summary: 'See what is running, measure it, and stop it politely.',
    objectives: [
      'List and filter processes with ps and a live view.',
      'Explain PID, parent process and exit status.',
      'Use SIGTERM before SIGKILL and know the difference.',
    ],
    minutes: 14,
    xpReward: 30,
    sections: [
      {
        heading: 'Everything is a process',
        body: [
          'Every running program has a PID and (usually) a parent PID. `ps aux` snapshots all processes; `top` or `htop` refreshes live. Sorting by CPU or memory finds what is actually consuming the machine.',
        ],
        code: 'ps aux --sort=-%mem | head\nps aux | grep "[n]ginx"    # brackets avoid matching grep itself\ntop -o %CPU',
      },
      {
        heading: 'Signals: ask, then insist',
        body: [
          'SIGTERM (15) asks a process to shut down — it can clean up and exit. SIGKILL (9) cannot be caught: the kernel tears it down immediately, leaving no chance to flush files or close sockets.',
          'Always try TERM first. Use KILL only when the process ignored the polite request.',
        ],
        code: 'kill 1234        # SIGTERM\necho $?           # exit status of the last command\nkill -9 1234      # SIGKILL — last resort',
      },
    ],
    exercise:
      'Run `ps aux | sort -k3 -nr | head` to see the top CPU consumers. Pick one you recognize, look up its purpose, then start a harmless process (e.g. `sleep 300 &`), find its PID with jobs/ps, and stop it with kill (not kill -9).',
    quiz: [
      {
        question: 'What is the difference between SIGTERM and SIGKILL?',
        options: ['No difference', 'SIGTERM can be handled and cleaned up; SIGKILL cannot', 'SIGKILL is faster to type', 'SIGTERM only works as root'],
        answerIndex: 1,
      },
      {
        question: 'What does `kill 4242` send by default?',
        options: ['SIGKILL', 'SIGTERM', 'SIGHUP', 'SIGSTOP'],
        answerIndex: 1,
      },
      {
        question: 'Why use `ps aux | grep "[n]ginx"`?',
        options: ['It runs faster', 'It prevents the grep process from matching itself', 'It shows only root processes', 'It formats output'],
        answerIndex: 1,
      },
    ],
    takeaways: [
      'ps snapshots, top/htop watch live.',
      'Ask with SIGTERM before insisting with SIGKILL.',
      'Exit status: 0 means success — check it with echo $?.',
    ],
  },
  {
    id: 'proc-02-services',
    pathId: 'processes',
    order: 2,
    title: 'Services and Init Systems',
    summary: 'How background services start, stop and report their state.',
    objectives: [
      'Inspect service status with systemctl.',
      'Explain enable vs start.',
      'Read a unit file to learn what a service actually runs.',
    ],
    minutes: 12,
    xpReward: 30,
    sections: [
      {
        heading: 'systemd in one pass',
        body: [
          'On modern Linux, systemd starts and supervises services. Each service is a unit; `systemctl status name` shows whether it is active, its recent log lines and its main PID.',
        ],
        code: 'systemctl status ssh\nsystemctl list-units --type=service --state=running\njournalctl -u ssh -n 50 --no-pager',
      },
      {
        heading: 'start vs enable',
        body: [
          '`start` affects now; `enable` affects future boots. A service that is started but not enabled dies on reboot — a classic source of "it worked yesterday" incidents.',
          'The unit file (or its drop-ins) tells you the ExecStart command, the user it runs as and its restart policy. Reading it is the fastest way to understand an unfamiliar service.',
        ],
        code: 'systemctl cat ssh.service\nsystemctl is-enabled ssh\nsystemctl enable --now ssh   # both at once',
      },
    ],
    exercise:
      'On a machine you own (or inside a local virtual machine): run systemctl status on one running service, open its unit file with systemctl cat, and note the ExecStart line and the user it runs as. If systemd is unavailable, use `brew services list` (macOS) or the Services panel (Windows) and record the equivalent facts.',
    quiz: [
      {
        question: 'What is the difference between start and enable?',
        options: ['No difference', 'start runs it now; enable makes it start at boot', 'enable is faster', 'start requires root, enable does not'],
        answerIndex: 1,
      },
      {
        question: 'Where do the logs for service "app" live under systemd?',
        options: ['/var/log/app.log only', 'journalctl -u app', '/etc/app', '~/.app'],
        answerIndex: 1,
      },
      {
        question: 'systemctl cat ssh.service shows…',
        options: ['The unit definition', 'The password', 'The kernel version', 'Open ports'],
        answerIndex: 0,
      },
    ],
    takeaways: [
      'start = now, enable = every boot.',
      'systemctl cat reveals what a service runs and as whom.',
      'journalctl -u <service> is the service’s own history.',
    ],
  },

  /* ---------------------- NETWORKING FUNDAMENTALS ---------------------- */
  {
    id: 'net-01-model',
    pathId: 'networking',
    order: 1,
    title: 'IP, Ports, TCP and UDP',
    summary: 'The four words behind every connection you have ever made.',
    objectives: [
      'Define IP address, port, TCP and UDP in plain language.',
      'Describe the difference between TCP and UDP guarantees.',
      'Map a real browser connection onto those terms.',
    ],
    minutes: 15,
    xpReward: 30,
    sections: [
      {
        heading: 'Finding a machine, finding an app',
        body: [
          'An IP address identifies a host on a network (192.168.1.10 on your LAN, a public address on the internet). A port number (0–65535) identifies which service on that host should receive the data — 80 for HTTP, 443 for HTTPS, 22 for SSH.',
          'Address + port is a socket endpoint. Two endpoints together identify a connection.',
        ],
        code: 'ip -brief addr\nss -tulpn          # listening sockets on Linux',
      },
      {
        heading: 'TCP reliability vs UDP speed',
        body: [
          'TCP establishes a handshake, numbers every segment, retransmits losses and delivers data in order — it is what makes web pages and file transfers correct. UDP sends datagrams with no handshake and no guarantees, which is why it suits video calls, DNS queries and gaming.',
          'Choosing between them is a trade-off: correctness and latency (TCP) versus speed and tolerance for loss (UDP).',
        ],
        code: 'ping -c 4 1.1.1.1\ncurl -sv https://example.com -o /dev/null 2>&1 | grep -E "Connected|subject"',
      },
    ],
    exercise:
      'Map your own current connection: which local IP does your machine use, which gateway does traffic leave through, and which port does your browser use to reach this page? Write the four terms (IP, port, TCP, TLS) in a single sentence describing that path.',
    quiz: [
      {
        question: 'Which best describes TCP?',
        options: ['Connectionless and unordered', 'Connection-oriented with ordered, reliable delivery', 'Encrypted by default', 'Used only for video'],
        answerIndex: 1,
      },
      {
        question: 'What does a port number identify?',
        options: ['The cable type', 'The service/application on a host', 'The operating system version', 'The network speed'],
        answerIndex: 1,
      },
      {
        question: 'Which protocol suits a live video call where dropped frames are acceptable?',
        options: ['TCP', 'UDP', 'FTP', 'SMTP'],
        answerIndex: 1,
      },
    ],
    takeaways: [
      'IP finds the host; the port finds the service.',
      'TCP = reliable and ordered; UDP = fast and forgiving.',
      'Address + port = one endpoint of a connection.',
    ],
  },
  {
    id: 'net-02-observe',
    pathId: 'networking',
    order: 2,
    title: 'Observing Your Network',
    summary: 'ip, ss, ping and traceroute — evidence instead of guessing.',
    objectives: [
      'List interfaces, addresses and routes.',
      'Find listening and established connections.',
      'Interpret basic reachability output.',
    ],
    minutes: 14,
    xpReward: 30,
    sections: [
      {
        heading: 'Interfaces, addresses, routes',
        body: [
          '`ip addr` shows every interface and its addresses; `ip route` shows where packets to each destination go next — usually one default route via your gateway.',
        ],
        code: 'ip addr\nip route show default\nip -s link          # counters and errors per interface',
      },
      {
        heading: 'Who is talking to whom',
        body: [
          '`ss -tulpn` lists listening sockets with the owning process; `-t` TCP, `-u` UDP, `-l` listening, `-p` process. `ping` checks round-trip reachability; `traceroute` (or `tracert`) shows the hop path.',
          'These four commands turn "the internet is broken" into a specific, testable statement.',
        ],
        code: 'ss -tulpn\nping -c 4 1.1.1.1\ntraceroute example.com   # tracert on Windows',
      },
    ],
    exercise:
      'On your own machine: identify your default gateway, list listening ports with ss -tulpn (or netstat -an on Windows/macOS), and ping a well-known public resolver. Record one listening port you did not know about and what process owns it.',
    quiz: [
      {
        question: 'What does `ip route` show?',
        options: ['Installed packages', 'Where packets for each destination are sent next', 'DNS records', 'Open files'],
        answerIndex: 1,
      },
      {
        question: 'Which flag combination lists listening TCP sockets with process names?',
        options: ['ss -tulpn', 'ip -a', 'ping -l', 'dig +tcp'],
        answerIndex: 0,
      },
      {
        question: 'A ping to your gateway succeeds but to the internet fails. What is most likely wrong?',
        options: ['Your DNS is broken', 'The path beyond your gateway is the problem', 'Your keyboard', 'Your display driver'],
        answerIndex: 1,
      },
    ],
    takeaways: [
      'ip addr / ip route describe configuration; ss describes live connections.',
      'Test layer by layer: local → gateway → internet → DNS.',
      'Observing beats guessing — collect evidence first.',
    ],
  },

  /* ---------------------- IP, DNS, HTTP & TLS ---------------------- */
  {
    id: 'proto-01-dns',
    pathId: 'protocols',
    order: 1,
    title: 'DNS: How Names Become Addresses',
    summary: 'Resolvers, record types, and what happens before a connection starts.',
    objectives: [
      'Describe the resolution path from browser to answer.',
      'Recognize A, AAAA, CNAME and TXT records.',
      'Perform and read a DNS lookup.',
    ],
    minutes: 14,
    xpReward: 30,
    sections: [
      {
        heading: 'The phone book with layers',
        body: [
          'DNS translates names to addresses. Your resolver (often your router or your ISP) first checks its cache; on a miss it asks the root, then the TLD registry, then the authoritative servers for the domain.',
          'A/AAAA hold IPv4/IPv6 addresses, CNAME aliases a name to another name, TXT carries arbitrary text used by email authentication and domain verification.',
        ],
        code: 'dig example.com A +short\ndig example.com NS +short\ndig example.com TXT +short',
      },
      {
        heading: 'Why it matters for security',
        body: [
            'DNS is the first thing an attacker can manipulate: poisoned answers redirect victims before TLS ever starts. It is also a rich telemetry source — the domains a device contacts tell a story about what it is doing.',
            'Caching means changes are not instant: TTL values decide how long an answer stays valid.',
        ],
        code: 'dig example.com A\n# Look for the "ANSWER SECTION" and the TTL before the record type',
      },
    ],
    exercise:
      'Resolve three domains: your email provider, a news site and a public resolver. Compare their TTLs and record types (A vs AAAA vs CNAME). Write one sentence on which uses aliases and why that is useful.',
    quiz: [
      {
        question: 'What does an A record contain?',
        options: ['An IPv6 address', 'An IPv4 address', 'A mail server', 'A certificate'],
        answerIndex: 1,
      },
      {
        question: 'What is a resolver’s first step on a cache miss?',
        options: ['Contact the authoritative server directly', 'Ask the root servers', 'Reboot', 'Flush the browser cache'],
        answerIndex: 1,
      },
      {
        question: 'Which record type is commonly used for domain verification and email policy?',
        options: ['TXT', 'PTR', 'MX priority', 'SOA only'],
        answerIndex: 0,
      },
    ],
    takeaways: [
      'Root → TLD → authoritative is the delegation chain.',
      'A = IPv4, AAAA = IPv6, CNAME = alias, TXT = arbitrary policy text.',
      'TTL decides how long answers stay cached.',
    ],
  },
  {
    id: 'proto-02-http',
    pathId: 'protocols',
    order: 2,
    title: 'HTTP Requests, Responses and Headers',
    summary: 'Read a request line, a status code and the headers that shape the page.',
    objectives: [
      'Break down method, path, version, status and headers.',
      'Explain what common status codes actually mean.',
      'Inspect headers of a real response.',
    ],
    minutes: 15,
    xpReward: 30,
    sections: [
      {
        heading: 'A request in plain text',
        body: [
          'HTTP is a text protocol: a request line (method + path + version), headers describing the client and expectations, an optional body. The response mirrors it with a status code and its own headers.',
          'Methods carry intent: GET reads, POST creates/submits, PUT replaces, PATCH updates, DELETE removes, HEAD fetches headers only.',
        ],
        code: 'curl -I https://example.com\n# HTTP/2 200\n# content-type: text/html; charset=utf-8\n# cache-control: max-age=...',
      },
      {
        heading: 'Status codes tell the real story',
        body: [
          '2xx succeeded, 3xx redirected, 4xx the client erred (401 unauthenticated, 403 unauthorized, 404 missing, 429 rate-limited), 5xx the server failed (500 crash, 503 unavailable).',
          'Reading the status before the body prevents a lot of wasted debugging — a 502 from a proxy looks nothing like an application bug.',
        ],
        code: "curl -s -o /dev/null -w '%{http_code}\\n' https://example.com\ncurl -s -D - -o /dev/null https://example.com | head -20",
      },
    ],
    exercise:
      'Use curl -I against three sites you use daily. Record the status code, content-type and any security-related headers you notice (e.g. strict-transport-security, content-security-policy). Note which site sends none and what that means.',
    quiz: [
      {
        question: 'What does a 403 response mean?',
        options: ['Not logged in', 'Authenticated but not allowed', 'Server crashed', 'Resource moved permanently'],
        answerIndex: 1,
      },
      {
        question: 'Which method is idempotent and typically replaces a resource?',
        options: ['POST', 'PUT', 'PATCH', 'CONNECT'],
        answerIndex: 1,
      },
      {
        question: 'What does curl -I fetch?',
        options: ['The full body', 'Headers only', 'Cookies only', 'A redirect target'],
        answerIndex: 1,
      },
    ],
    takeaways: [
      'Method + path + version describes intent; status describes outcome.',
      '4xx = your request; 5xx = their server.',
      'Headers control caching, content type and security policy.',
    ],
  },
  {
    id: 'proto-03-tls',
    pathId: 'protocols',
    order: 3,
    title: 'TLS: Why Connections Are Encrypted',
    summary: 'Certificates, the handshake, and what HTTPS actually guarantees.',
    objectives: [
      'Describe the purpose of the TLS handshake.',
      'Explain what a certificate proves — and what it does not.',
      'Inspect certificate details of a live site.',
    ],
    minutes: 13,
    xpReward: 30,
    sections: [
      {
        heading: 'Confidentiality plus identity',
        body: [
          'TLS negotiates cipher suites, exchanges keys and authenticates the server with a certificate signed by a trusted authority. After the handshake, traffic is encrypted and integrity-protected.',
          'Encryption alone would still allow an impostor — the certificate is what binds the key to the name you typed.',
        ],
        code: 'openssl s_client -connect example.com:443 -servername example.com </dev/null 2>/dev/null | openssl x509 -noout -subject -issuer -dates',
      },
      {
        heading: 'What HTTPS does and does not tell you',
        body: [
          'HTTPS proves the connection reached the right server and cannot be read in transit. It says nothing about whether the site is honest — a phishing page can have a perfectly valid certificate.',
          'A certificate warning is a stop sign, not a speed bump: proceed only when you know exactly why it appeared.',
        ],
        code: "curl -s -o /dev/null -w '%{ssl_verify_result}\\n' https://example.com",
      },
    ],
    exercise:
      'Inspect the certificate of one site you trust: subject, issuer, validity dates and the signature algorithm. Compare with a site you do not recognize (do not bypass warnings). Record who signed each and what that chain of trust implies.',
    quiz: [
      {
        question: 'What does a CA-signed certificate prove?',
        options: ['The site content is true', 'The domain identity is bound to the public key by a trusted third party', 'The server is fast', 'The connection uses UDP'],
        answerIndex: 1,
      },
      {
        question: 'HTTPS protects against which of these?',
        options: ['Phishing content', 'Eavesdropping and tampering in transit', 'A compromised server', 'Weak passwords'],
        answerIndex: 1,
      },
      {
        question: 'When should you bypass a certificate warning?',
        options: ['Whenever the page looks normal', 'Never, unless you own the endpoint and understand the cause', 'Only in incognito mode', 'On every first visit'],
        answerIndex: 1,
      },
    ],
    takeaways: [
      'TLS = encrypted channel + authenticated identity.',
      'A valid certificate does not mean a trustworthy site.',
      'Certificate warnings deserve investigation, not clicks.',
    ],
  },

  /* ---------------------- SCRIPTING ---------------------- */
  {
    id: 'bash-01-anatomy',
    pathId: 'scripting',
    order: 1,
    title: 'Bash Script Anatomy',
    summary: 'Shebang, variables, exit codes and defensive defaults.',
    objectives: [
      'Structure a script with a shebang and strict mode.',
      'Use variables and command substitution correctly.',
      'Check exit codes instead of assuming success.',
    ],
    minutes: 16,
    xpReward: 35,
    sections: [
      {
        heading: 'The skeleton of a reliable script',
        body: [
          'The shebang picks the interpreter; strict mode (`set -euo pipefail`) makes unbound variables and failing pipelines stop the script instead of sailing on. Quote your variables so spaces do not shatter arguments.',
        ],
        code: '#!/usr/bin/env bash\nset -euo pipefail\n\nname="${1:?usage: report.sh <target>}"\necho "reporting on: $name"',
      },
      {
        heading: 'Exit codes are contracts',
        body: [
          'Every command exits 0 on success, non-zero on failure. `$?` holds the last code. `if cmd; then` is the idiomatic check — and it is immune to the pitfalls of testing $? manually.',
          'Command substitution `$(...)` captures output into a variable; use it to build inputs for the next step.',
        ],
        code: 'if grep -q "ERROR" app.log; then\n  echo "errors found"\nelse\n  echo "clean"\nfi\n\ncount=$(grep -c "ERROR" app.log || true)',
      },
    ],
    exercise:
      'Write report.sh that takes one argument, prints usage if missing, greps a log file for ERROR and exits 0 when found, 1 when clean. Run it both ways and echo $? after each run to verify your exit codes.',
    quiz: [
      {
        question: 'What does `set -euo pipefail` do?',
        options: ['Enables colors', 'Exits on error, on unset variables, and on failed pipeline stages', 'Sets the file encoding', 'Enables POSIX mode only'],
        answerIndex: 1,
      },
      {
        question: 'Why quote variables like "$file"?',
        options: ['It is faster', 'So spaces in values do not split into multiple arguments', 'To make it readonly', 'Required by bash'],
        answerIndex: 1,
      },
      {
        question: 'Exit code 0 from a script means…',
        options: ['It printed output', 'It succeeded', 'It found the file', 'It is executable'],
        answerIndex: 1,
      },
    ],
    takeaways: [
      'Always start with shebang + set -euo pipefail.',
      'Quote every variable expansion.',
      'Exit codes are the API between your scripts.',
    ],
  },
  {
    id: 'bash-02-control',
    pathId: 'scripting',
    order: 2,
    title: 'Loops, Conditionals and Arguments',
    summary: 'Process files and arguments without repeating yourself.',
    objectives: [
      'Iterate over arguments and files safely.',
      'Branch with if/elif and test operators.',
      'Use functions to keep scripts readable.',
    ],
    minutes: 16,
    xpReward: 35,
    sections: [
      {
        heading: 'Loops that survive spaces',
        body: [
          'A `for f in *.txt` loop breaks on filenames with spaces unless you quote the expansion. Safer patterns loop over a null-delimited stream with while read.',
        ],
        code: 'for f in *.txt; do\n  [ -e "$f" ] || continue\n  echo "size of $f: $(wc -c < "$f")"\ndone\n\nfind . -name "*.log" -print0 | while IFS= read -r -d "" file; do\n  echo "log: $file"\ndone',
      },
      {
        heading: 'Tests and functions',
        body: [
          '`[ ... ]` tests files and strings; `[[ ... ]]` adds bash features like regex matching. Functions group logic once and make scripts testable.',
        ],
        code: 'backup_if_present() {\n  local target="$1"\n  if [[ -f "$target" ]]; then\n    cp -p "$target" "$target.bak"\n    echo "backed up $target"\n  else\n    echo "missing: $target" >&2\n    return 1\n  fi\n}\n\nbackup_if_present notes.txt',
      },
    ],
    exercise:
      'Extend your report script: accept multiple log paths, loop over them with a function, print per-file error counts, and return non-zero if any file had errors. Verify with two files — one clean, one not.',
    quiz: [
      {
        question: 'Why add `-print0` with `read -d ""`?',
        options: ['It is faster', 'It handles filenames containing spaces and newlines safely', 'It prints sizes', 'It filters hidden files'],
        answerIndex: 1,
      },
      {
        question: 'Difference between [ ] and [[ ]]?',
        options: ['No difference', '[[ ]] is a bash keyword with regex and safer expansions', '[ ] requires root', '[[ ]] only works in zsh'],
        answerIndex: 1,
      },
      {
        question: 'What does `local` do inside a function?',
        options: ['Makes the variable global', 'Scopes the variable to the function', 'Declares a loop', 'Loads a config file'],
        answerIndex: 1,
      },
    ],
    takeaways: [
      'Null-delimited reads make filename loops robust.',
      '`[[ ]]` for bash tests, `[ ]` for POSIX compatibility.',
      'Functions + local variables keep scripts maintainable.',
    ],
  },
  {
    id: 'pyth-01-automation',
    pathId: 'scripting',
    order: 1,
    title: 'Python for Automation',
    summary: 'Read files, transform data, and produce a report — with functions.',
    objectives: [
      'Parse text into structured data with basic types.',
      'Wrap logic in functions with clear names.',
      'Handle the happy path and at least one edge case.',
    ],
    minutes: 18,
    xpReward: 35,
    sections: [
      {
        heading: 'Data in, data out',
        body: [
          'Most automation is: read input, transform, write output. Lists hold sequences, dicts hold named fields, and comprehensions filter them concisely.',
        ],
        code: 'from pathlib import Path\n\ndef count_levels(path: Path) -> dict[str, int]:\n    counts: dict[str, int] = {}\n    if not path.exists():\n        return counts\n    for line in path.read_text(encoding="utf-8").splitlines():\n        level = line.split(" ", 1)[0] if line else "EMPTY"\n        counts[level] = counts.get(level, 0) + 1\n    return counts\n\nprint(count_levels(Path("app.log")))',
      },
      {
        heading: 'Edge cases are the job',
        body: [
          'A script that works only on the demo file is a demo. Ask: what if the file is missing, empty, or malformed? Returning a safe default beats crashing.',
          'f-strings keep output readable; `pathlib` avoids fragile string paths; and argparse turns your script into a tool others can use.',
        ],
        code: 'import argparse\n\nparser = argparse.ArgumentParser(description="Summarize a log")\nparser.add_argument("path")\nparser.add_argument("--top", type=int, default=5)\nargs = parser.parse_args()\nprint(f"summarizing {args.path}, top {args.top}")',
      },
    ],
    exercise:
      'Write summarize.py that takes a log path, counts lines by their first token, prints the top 5, and exits gracefully with a clear message if the file does not exist. Test with a real file, an empty file and a missing file.',
    quiz: [
      {
        question: 'Which type maps keys to values?',
        options: ['list', 'dict', 'tuple', 'set only'],
        answerIndex: 1,
      },
      {
        question: 'Best first response to a missing input file?',
        options: ['Traceback and exit 1 immediately', 'Check existence and print a clear message', 'Create an empty file silently', 'Ignore it'],
        answerIndex: 1,
      },
      {
        question: 'What does Path.read_text(encoding="utf-8") avoid?',
        options: ['Slow IO', 'Platform-dependent decoding errors', 'Memory use', 'Nothing'],
        answerIndex: 1,
      },
    ],
    takeaways: [
      'Read → transform → write is the shape of most scripts.',
      'Handle missing/empty input deliberately.',
      'Functions with descriptive names are documentation that runs.',
    ],
  },

  /* ---------------------- DEFENSIVE SECURITY ---------------------- */
  {
    id: 'sec-01-threat-model',
    pathId: 'defensive',
    order: 1,
    title: 'Threat Modeling for Ordinary Systems',
    summary: 'What are you protecting, from whom, and what would "win" look like?',
    objectives: [
      'Frame assets, adversaries and trust boundaries.',
      'Rank risks by likelihood and impact.',
      'Choose controls that match the actual threat.',
    ],
    minutes: 15,
    xpReward: 35,
    sections: [
      {
        heading: 'Four questions before any tool',
        body: [
          'What are we protecting? Who wants it? How much would an attack cost? What are we willing to spend? Security is prioritization, not maximalism.',
          'Your laptop holding family photos faces a different adversary than a public API processing payments — the controls differ accordingly.',
        ],
        code: 'Asset: photo library\nAdversary: opportunistic malware, not a nation state\nThreat: ransomware via phishing\nControls: backups (3-2-1), MFA, updates, no email attachments from strangers',
      },
      {
        heading: 'Trust boundaries and blast radius',
        body: [
          'A trust boundary is where data changes hands — a form submission, an API call, a file upload. Most real incidents are boundaries that were never thought about.',
          'Ask "if this component is compromised, what else falls?" That is blast radius, and segmentation is how you shrink it.',
        ],
        code: 'Boundary checklist:\n1. What crosses it (data, code, credentials)?\n2. Who validates it, and where?\n3. What is reachable from the other side?',
      },
    ],
    exercise:
      'Pick one system you use daily (a notes app, a home router). Write four lines: top asset, most likely adversary, one realistic attack path, and the single control that most reduces that path. Keep it under 100 words.',
    quiz: [
      {
        question: 'What is a trust boundary?',
        options: ['A firewall rule number', 'A point where data changes hands between levels of trust', 'A country border', 'A password policy'],
        answerIndex: 1,
      },
      {
        question: 'Blast radius refers to…',
        options: ['Explosion damage', 'How much is compromised after one component fails', 'Server CPU load', 'Backup size'],
        answerIndex: 1,
      },
      {
        question: 'The correct first step in securing a personal laptop is…',
        options: ['Buy enterprise software', 'Decide what actually matters to protect', 'Change DNS', 'Encrypt the screen'],
        answerIndex: 1,
      },
    ],
    takeaways: [
      'Assets → adversaries → controls, in that order.',
      'Match effort to likelihood and impact.',
      'Shrinking blast radius beats perfect hardening.',
    ],
  },
  {
    id: 'sec-02-secrets',
    pathId: 'defensive',
    order: 2,
    title: 'Secrets, Passwords and MFA',
    summary: 'The highest-return defensive moves available to anyone.',
    objectives: [
      'Explain why password managers beat memory.',
      'Identify secrets that must never enter a repository.',
      'Enable and understand phishing-resistant MFA.',
    ],
    minutes: 13,
    xpReward: 35,
    sections: [
      {
        heading: 'One strong secret per service',
        body: [
          'Reuse turns one breach into five. A password manager generates and stores unique random credentials so your memory only guards one master passphrase.',
          'Long beats complex: a memorable four-word passphrase resists guessing far better than `P@ssw0rd!`.',
        ],
        code: '# Good: unique, long, stored in a manager\n# Bad: same password on five sites, variants of your pet\'s name',
      },
      {
        heading: 'Keep secrets out of code',
        body: [
          'API keys, tokens and private keys belong in environment variables or a secret manager — never in source control. History counts: removing a key from the latest commit does not remove it from history; rotate it.',
          'MFA matters most when it resists phishing: passkeys and hardware security keys beat SMS, and any MFA beats none.',
        ],
        code: '# .gitignore\n.env\n*.pem\n\n# Check before you commit:\ngit diff --cached | grep -Ei "(api[_-]?key|secret|password)" || echo "clean"',
      },
    ],
    exercise:
      'Audit yourself: find one reused password and replace it with a unique generated one; scan your most recent repository for anything resembling a credential (`git log -p | grep -i "api_key"`); enable an app-based or hardware key on your most important account.',
    quiz: [
      {
        question: 'You committed an API key by mistake. What is the correct response?',
        options: ['Delete the file in a new commit', 'Revoke/rotate the key, then clean history if needed', 'Change the key name', 'Do nothing — files are private'],
        answerIndex: 1,
      },
      {
        question: 'Which is strongest against phishing?',
        options: ['SMS code', 'Hardware security key / passkey', 'Security questions', 'A longer SMS code'],
        answerIndex: 1,
      },
      {
        question: 'Why unique passwords per site?',
        options: ['They are easier to remember', 'A breach of one service cannot unlock others', 'They expire faster', 'They are shorter'],
        answerIndex: 1,
      },
    ],
    takeaways: [
      'Unique credentials everywhere; one master to remember.',
      'Secrets never enter source control — and rotation beats deletion.',
      'Phishing-resistant MFA is the single best account upgrade.',
    ],
  },
  {
    id: 'sec-03-hardening',
    pathId: 'defensive',
    order: 3,
    title: 'Hardening Basics',
    summary: 'Updates, least privilege, firewalls and logging — the boring essentials.',
    objectives: [
      'Apply least privilege to accounts and services.',
      'Describe what a host firewall actually does.',
      'Decide which events are worth logging.',
    ],
    minutes: 14,
    xpReward: 35,
    sections: [
      {
        heading: 'Least privilege, applied',
        body: [
          'Most daily work should happen as a normal user, escalating only when a task requires it. Services should run as their own low-privilege account with access to only what they need.',
          'If everything runs as administrator, one vulnerability becomes total compromise.',
        ],
        code: '# Linux: check sudo/admin membership\nid\ngetent group sudo 2>/dev/null || getent group wheel',
      },
      {
        heading: 'Patching and exposure',
        body: [
          'Unpatched known vulnerabilities are the most common way systems fall — automatic updates are the cheapest control you own.',
          'A host firewall is a allow-list: only the ports you actually use are reachable. Combined with disabling services you do not run, it removes entire categories of exposure.',
        ],
        code: 'sudo apt update && apt list --upgradable   # Debian/Ubuntu\nsudo ufw status verbose                    # host firewall (Linux)',
      },
    ],
    exercise:
      'On a machine you own: list the services listening on it, decide for each whether it must be public, and disable or firewall one that does not. Confirm your OS updates are automatic. Write down what you disabled and why it was safe.',
    quiz: [
      {
        question: 'Least privilege means…',
        options: ['Using the cheapest server', 'Each account/service gets only the access it needs', 'Hiding admin tools', 'Shorter passwords'],
        answerIndex: 1,
      },
      {
        question: 'A host firewall primarily does what?',
        options: ['Encrypts traffic', 'Filters which ports/connections reach this machine', 'Scans for malware', 'Patches software'],
        answerIndex: 1,
      },
      {
        question: 'Why log security-relevant events?',
        options: ['For compliance theater', 'So you can detect and reconstruct what happened', 'To fill disks', 'Because logs are free'],
        answerIndex: 1,
      },
    ],
    takeaways: [
      'Escalate only when required; run services as service accounts.',
      'Automatic updates + an allow-list firewall stop the common stuff.',
      'Log logins, privilege changes and failures — and read them.',
    ],
  },

  /* ---------------------- AUTHORIZED LABS ---------------------- */
  {
    id: 'lab-01-enumerate',
    pathId: 'labs',
    order: 1,
    title: 'Lab: Enumerate Your Own Machine',
    summary: 'A safe first lab — gather real evidence from a system you own.',
    objectives: [
      'Collect users, processes, listening ports and open files.',
      'Connect each observation to a hardening decision.',
      'Produce a short written report of your findings.',
    ],
    minutes: 25,
    xpReward: 40,
    sections: [
      {
        heading: 'Authorization is the first control',
        body: [
          'This lab targets your own machine (or a VM you created). Everything you run here is non-destructive observation. That boundary — systems you own or are explicitly authorized to test — is absolute in this academy.',
        ],
        code: '# Observation toolkit (Linux/macOS)\nid\nuname -a\nss -tulpn\ncat /etc/os-release\nls -la ~ | head',
      },
      {
        heading: 'From evidence to decision',
        body: [
          'Enumeration is not the goal; decisions are. For every listening port: does it need to be listening? For every account: does it need admin? For every service: is it patched?',
          'Write findings as "observation → risk → action", which is exactly how a professional finding reads.',
        ],
        code: 'Observation: port 8080 listening on 0.0.0.0\nRisk: dev server reachable from the local network\nAction: bind to 127.0.0.1 or stop the service',
      },
    ],
    exercise:
      'Run the observation toolkit on a machine you own. Record three findings in "observation → risk → action" format, then actually apply one action (for example, stop an unused service or restrict it to localhost) and re-run the check to confirm.',
    quiz: [
      {
        question: 'Which target is appropriate for this lab?',
        options: ['A public website you do not own', 'Your own laptop or a VM you created', 'A neighbor’s router', 'Any host with an open port'],
        answerIndex: 1,
      },
      {
        question: '`ss -tulpn` shows…',
        options: ['File permissions', 'Listening sockets and owning processes', 'DNS records', 'User passwords'],
        answerIndex: 1,
      },
      {
        question: 'A finding should contain…',
        options: ['Only a screenshot', 'Observation, risk and recommended action', 'Just an IP', 'A guess'],
        answerIndex: 1,
      },
    ],
    takeaways: [
      'Only systems you own or are authorized to test.',
      'Enumeration is only useful if it changes a decision.',
      'Observation → risk → action is the report format.',
    ],
  },
  {
    id: 'lab-02-vulnerable-env',
    pathId: 'labs',
    order: 2,
    title: 'Lab: Practice in Intentionally Vulnerable Environments',
    summary: 'Where to safely develop real skill — and the rules that keep it ethical.',
    objectives: [
      'Name reputable intentionally-vulnerable training environments.',
      'Explain why isolation matters when running vulnerable software.',
      'Document what you learned from one completed challenge.',
    ],
    minutes: 20,
    xpReward: 40,
    sections: [
      {
        heading: 'Practice where it is legal by design',
        body: [
          'Training platforms exist precisely so you can attack something: Capture-The-Flag challenges (PicoCTF, OverTheWire, pwn.college), deliberately vulnerable web apps (DVWA, OWASP WebGoat), and local vulnerable VMs (Metasploitable, OWASP Juice Shop).',
          'CTF-style puzzles build transferable skills: enumeration, reading error messages, reasoning about how something was built before thinking about how it breaks.',
        ],
        code: '# Rule of engagement checklist\n[ ] I own it, or the platform authorizes testing\n[ ] It runs isolated (host-only/NAT network, no production data)\n[ ] I will document what I learned afterwards',
      },
      {
        heading: 'Isolation and documentation',
        body: [
          'Run vulnerable images on a host-only or NAT network, never bridged to a network with devices you care about, and never with real personal data inside them.',
          'The learning sticks when you write it down: reproduce steps, root cause, and the defensive fix. That fix is the part you will reuse in real work.',
        ],
        code: 'Lab note template:\n1. Environment + target\n2. Steps taken (reproducible)\n3. Root cause\n4. Defensive fix\n5. What I would do differently',
      },
    ],
    exercise:
      'Complete one beginner challenge on a platform such as OverTheWire (Bandit level 1) or PicoCTF (one easy misc/forensics challenge), then write the five-line lab note template for it. Record the defensive fix, not just the solution.',
    quiz: [
      {
        question: 'Which statement about vulnerable practice environments is correct?',
        options: ['They may be pointed at any target', 'They are designed and authorized for practice', 'They bypass local law', 'They require no notes'],
        answerIndex: 1,
      },
      {
        question: 'Why host-only/NAT networking for vulnerable VMs?',
        options: ['It is faster', 'It prevents the vulnerable VM from reaching devices you care about', 'It enables updates', 'It is required by CTF platforms'],
        answerIndex: 1,
      },
      {
        question: 'The most valuable part of a lab write-up is…',
        options: ['Screenshots', 'The root cause and the defensive fix', 'The tool name', 'Word count'],
        answerIndex: 1,
      },
    ],
    takeaways: [
      'Authorized targets only — ownership or explicit permission, always.',
      'Isolate vulnerable software from real networks and real data.',
      'Write up root cause and fix; that is what transfers to real work.',
    ],
  },
];

export const LESSON_MAP: Record<string, LearningLesson> = Object.fromEntries(
  LESSONS.map((l) => [l.id, l]),
);

export function lessonsForPath(pathId: string): LearningLesson[] {
  return LESSONS.filter((l) => l.pathId === pathId).sort((a, b) => a.order - b.order);
}
