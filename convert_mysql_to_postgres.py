import re
import os

def convert_mysql_to_postgres(input_file, output_file):
    if not os.path.exists(input_file):
        print(f"Error: {input_file} not found.")
        return

    with open(input_file, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    output = []
    output.append("-- PostgreSQL Data-Only Import\n")
    output.append("BEGIN;\n")
    output.append("SET session_replication_role = 'replica';\n\n")

    in_skip = False
    
    for line in lines:
        stripped = line.strip()
        upper = stripped.upper()
        
        # Force out of skip block if we see data indicators
        if upper.startswith('INSERT INTO') or upper.startswith('-- DUMPING DATA'):
            in_skip = False
            
        # structural markers to skip
        if not in_skip:
            if upper.startswith(('CREATE ', 'ALTER ', 'DROP ', 'SET ', 'LOCK ', 'UNLOCK ')):
                in_skip = True
                if stripped.endswith(';'):
                    in_skip = False
                continue
        else:
            if stripped.endswith(';'):
                in_skip = False
            continue

        # If we are here, we are NOT in a skip block
        # Process and keep
        processed = line.replace('`', '"')
        processed = processed.replace("\\'", "''")
        processed = processed.replace('current_timestamp()', 'CURRENT_TIMESTAMP')
        
        # Skip comments that look like structural headers or version info
        if not (stripped.startswith(('/*!', '-- TABLE STRUCTURE', '-- CONSTRAINTS', '-- STRUCTURE FOR'))):
            # Also skip some meta-commands MySQL dumps often have
            if not upper.startswith(('START TRANSACTION', 'COMMIT;', 'BEGIN;', 'SET ')):
                # If the line isn't empty after we removed everything, keep it
                output.append(processed)

    output.append("\nCOMMIT;\n")
    output.append("SET session_replication_role = 'origin';\n\n")
    
    output.append("-- Update sequences\n")
    tables = ['users', 'sessions', 'chat_history', 'session_visuals']
    for table in tables:
        output.append(f"SELECT setval(pg_get_serial_sequence('\"{table}\"', 'id'), coalesce(max(id), 1), max(id) IS NOT NULL) FROM \"{table}\";\n")

    with open(output_file, 'w', encoding='utf-8') as f:
        f.writelines(output)

    print(f"Conversion complete (Data Only)! Output saved to {output_file}")

if __name__ == "__main__":
    convert_mysql_to_postgres('meetingai (1).sql', 'meetingai_postgres.sql')
