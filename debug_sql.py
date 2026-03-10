with open('meetingai (1).sql', 'r', encoding='utf-8') as f:
    lines = f.readlines()

in_skip = False
for i, line in enumerate(lines):
    clean = line.strip()
    upper = clean.upper()
    
    if not in_skip:
        if upper.startswith(('CREATE TABLE', 'ALTER TABLE', 'DROP TABLE', 'CREATE INDEX', 'SET ')):
            in_skip = True
            if clean.endswith(';'):
                in_skip = False
                print(f"L{i+1} SKIP SINGLE: {clean[:50]}")
            else:
                print(f"L{i+1} SKIP START: {clean[:50]}")
            continue
    else:
        if clean.endswith(';'):
            in_skip = False
            print(f"L{i+1} SKIP END: {clean[:50]}")
        continue

    if 'INSERT INTO' in upper:
        print(f"L{i+1} KEEP INSERT: {clean[:50]}")
