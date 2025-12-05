import os
import csv
import sys
sys.setrecursionlimit(2000)

class SudokuGrader:
    def __init__(self, puzzle_str):
        # Handle '.' as empty cell (0)
        puzzle_str = puzzle_str.replace('.', '0')
        if len(puzzle_str) != 81:
            raise ValueError(f"Invalid puzzle length: {len(puzzle_str)}")
        self.grid = [int(c) for c in puzzle_str]
        self.original = list(self.grid)
        self.candidates = [set(range(1, 10)) if x == 0 else set() for x in self.grid]
        self.solved = False
        self.difficulty = 0  # 0: Beginner, 1: Novice, 2: Intermediate, 3: Advanced, 4: Expert
        self.reason_trace = [] # List of (difficulty, technique_name)
        
        # Precompute groups
        self.rows = [[r * 9 + c for c in range(9)] for r in range(9)]
        self.cols = [[r * 9 + c for r in range(9)] for c in range(9)]
        self.boxes = []
        for r in range(0, 9, 3):
            for c in range(0, 9, 3):
                box = []
                for i in range(3):
                    for j in range(3):
                        box.append((r + i) * 9 + (c + j))
                self.boxes.append(box)
        self.units = self.rows + self.cols + self.boxes
        self.peers = [set() for _ in range(81)]
        for i in range(81):
            for unit in self.units:
                if i in unit:
                    self.peers[i].update(unit)
            self.peers[i].remove(i)

        # Initial candidate pruning
        for i in range(81):
            if self.grid[i] != 0:
                self.eliminate_candidates(i, self.grid[i])

    def eliminate_candidates(self, idx, val):
        for peer in self.peers[idx]:
            if val in self.candidates[peer]:
                self.candidates[peer].remove(val)

    def is_solved(self):
        return all(x != 0 for x in self.grid)

    def set_value(self, idx, val):
        self.grid[idx] = val
        self.candidates[idx] = set()
        self.eliminate_candidates(idx, val)

    def has_contradiction(self):
        for i in range(81):
            if self.grid[i] == 0 and len(self.candidates[i]) == 0:
                return True
        return False

    def solve_step(self):
        # 1. Beginner: Full House, Hidden Single (Block)
        if self.apply_full_house(): return 0
        if self.apply_hidden_single_block(): return 0
        
        # 2. Novice: Hidden Single (Row/Col), Naked Single
        if self.apply_hidden_single_row_col(): return 1
        if self.apply_naked_single(): return 1
        
        # 3. Intermediate: Locked Candidates, Naked/Hidden Pairs/Triples
        if self.apply_locked_candidates(): return 2
        if self.apply_naked_pairs_triples(): return 2
        if self.apply_hidden_pairs_triples(): return 2
        
        # 4. Advanced: X-Wing, Y-Wing
        if self.apply_x_wing(): return 3
        if self.apply_y_wing(): return 3
        
        # If stuck, it's Expert
        return 4

    def grade(self):
        while not self.is_solved():
            step_diff = self.solve_step()
            
            if self.has_contradiction():
                self.reason_trace.append((4, "모순 발생 (Contradiction)", {}))
                return 4 # Treat as Expert/Unsolvable by logic

            self.difficulty = max(self.difficulty, step_diff)
            if step_diff == 4:
                self.reason_trace.append((4, "전문가 기술 필요 (또는 풀이 불가)", {}))
                break # Stuck or Expert technique required
        return self.difficulty

    # --- Techniques ---
    # Each technique should return True if it made a change (eliminated candidate or set value)
    # And append to self.reason_trace with details
    
    def apply_full_house(self):
        for unit in self.units:
            # Check if unit has only 1 empty cell
            empty_cells = [i for i in unit if self.grid[i] == 0]
            if len(empty_cells) == 1:
                idx = empty_cells[0]
                # Find the missing number
                present = {self.grid[i] for i in unit if self.grid[i] != 0}
                missing = set(range(1, 10)) - present
                val = list(missing)[0]
                self.set_value(idx, val)
                self.reason_trace.append((0, "풀 하우스 (Full House)", {"cell": idx, "val": val}))
                return True
        return False

    def apply_hidden_single_block(self):
        for b in range(9):
            box_indices = self.boxes[b]
            for val in range(1, 10):
                possible_locs = [i for i in box_indices if self.grid[i] == 0 and val in self.candidates[i]]
                if len(possible_locs) == 1:
                    idx = possible_locs[0]
                    self.set_value(idx, val)
                    self.reason_trace.append((0, "히든 싱글 (블록) (Hidden Single - Block)", {"cell": idx, "val": val, "box": b}))
                    return True
        return False

    def apply_hidden_single_row_col(self):
        # Rows
        for r in range(9):
            row_indices = self.rows[r]
            for val in range(1, 10):
                possible_locs = [i for i in row_indices if self.grid[i] == 0 and val in self.candidates[i]]
                if len(possible_locs) == 1:
                    idx = possible_locs[0]
                    self.set_value(idx, val)
                    self.reason_trace.append((1, "히든 싱글 (행) (Hidden Single - Row)", {"cell": idx, "val": val, "row": r}))
                    return True
        # Cols
        for c in range(9):
            col_indices = self.cols[c]
            for val in range(1, 10):
                possible_locs = [i for i in col_indices if self.grid[i] == 0 and val in self.candidates[i]]
                if len(possible_locs) == 1:
                    idx = possible_locs[0]
                    self.set_value(idx, val)
                    self.reason_trace.append((1, "히든 싱글 (열) (Hidden Single - Col)", {"cell": idx, "val": val, "col": c}))
                    return True
        return False

    def apply_naked_single(self):
        for i in range(81):
            if self.grid[i] == 0 and len(self.candidates[i]) == 1:
                val = list(self.candidates[i])[0]
                self.set_value(i, val)
                self.reason_trace.append((1, "네이키드 싱글 (Naked Single)", {"cell": i, "val": val}))
                return True
        return False

    def apply_locked_candidates(self):
        # Pointing: Box -> Row/Col
        for b in range(9):
            box_indices = self.boxes[b]
            for val in range(1, 10):
                # Find cells in box with this candidate
                locs = [i for i in box_indices if self.grid[i] == 0 and val in self.candidates[i]]
                if not locs: continue
                
                # Check if all in same row
                rows = {i // 9 for i in locs}
                if len(rows) == 1:
                    r = list(rows)[0]
                    # Eliminate from rest of row
                    changed = False
                    eliminated_from = []
                    for c in range(9):
                        idx = r * 9 + c
                        if idx not in box_indices and self.grid[idx] == 0 and val in self.candidates[idx]:
                            self.candidates[idx].remove(val)
                            eliminated_from.append(idx)
                            changed = True
                    if changed:
                        self.reason_trace.append((2, "포인팅 (Pointing)", {"val": val, "box": b, "row": r, "elim": eliminated_from}))
                        return True
                
                # Check if all in same col
                cols = {i % 9 for i in locs}
                if len(cols) == 1:
                    c = list(cols)[0]
                    # Eliminate from rest of col
                    changed = False
                    eliminated_from = []
                    for r in range(9):
                        idx = r * 9 + c
                        if idx not in box_indices and self.grid[idx] == 0 and val in self.candidates[idx]:
                            self.candidates[idx].remove(val)
                            eliminated_from.append(idx)
                            changed = True
                    if changed:
                        self.reason_trace.append((2, "포인팅 (Pointing)", {"val": val, "box": b, "col": c, "elim": eliminated_from}))
                        return True

        # Claiming: Row/Col -> Box
        # Row -> Box
        for r in range(9):
            row_indices = self.rows[r]
            for val in range(1, 10):
                locs = [i for i in row_indices if self.grid[i] == 0 and val in self.candidates[i]]
                if not locs: continue
                
                # Check if all in same box
                boxes = {(i // 9 // 3) * 3 + (i % 9 // 3) for i in locs}
                if len(boxes) == 1:
                    b = list(boxes)[0]
                    # Eliminate from rest of box
                    changed = False
                    eliminated_from = []
                    box_indices = self.boxes[b]
                    for idx in box_indices:
                        if idx not in row_indices and self.grid[idx] == 0 and val in self.candidates[idx]:
                            self.candidates[idx].remove(val)
                            eliminated_from.append(idx)
                            changed = True
                    if changed:
                        self.reason_trace.append((2, "클레임 (Claiming)", {"val": val, "row": r, "box": b, "elim": eliminated_from}))
                        return True

        # Col -> Box
        for c in range(9):
            col_indices = self.cols[c]
            for val in range(1, 10):
                locs = [i for i in col_indices if self.grid[i] == 0 and val in self.candidates[i]]
                if not locs: continue
                
                # Check if all in same box
                boxes = {(i // 9 // 3) * 3 + (i % 9 // 3) for i in locs}
                if len(boxes) == 1:
                    b = list(boxes)[0]
                    # Eliminate from rest of box
                    changed = False
                    eliminated_from = []
                    box_indices = self.boxes[b]
                    for idx in box_indices:
                        if idx not in col_indices and self.grid[idx] == 0 and val in self.candidates[idx]:
                            self.candidates[idx].remove(val)
                            eliminated_from.append(idx)
                            changed = True
                    if changed:
                        self.reason_trace.append((2, "클레임 (Claiming)", {"val": val, "col": c, "box": b, "elim": eliminated_from}))
                        return True
                        
        return False

    def apply_naked_pairs_triples(self):
        # Check all units (rows, cols, boxes)
        for unit in self.units:
            # Find cells with 2 or 3 candidates
            candidates_cells = {} # tuple(candidates) -> list of cell indices
            for idx in unit:
                if self.grid[idx] == 0:
                    cands = tuple(sorted(list(self.candidates[idx])))
                    if 2 <= len(cands) <= 3:
                        if cands not in candidates_cells: candidates_cells[cands] = []
                        candidates_cells[cands].append(idx)
            
            # Check for Naked Pairs/Triples
            # Exact matches first (e.g. {1,2} in 2 cells)
            for cands, cells in candidates_cells.items():
                if len(cells) == len(cands):
                    # Found Naked Pair/Triple
                    # Eliminate these candidates from other cells in unit
                    changed = False
                    eliminated_from = []
                    for idx in unit:
                        if idx not in cells and self.grid[idx] == 0:
                            original = self.candidates[idx].copy()
                            self.candidates[idx] -= set(cands)
                            if self.candidates[idx] != original:
                                eliminated_from.append(idx)
                                changed = True
                    if changed:
                        name = "네이키드 페어 (Naked Pair)" if len(cands) == 2 else "네이키드 트리플 (Naked Triple)"
                        self.reason_trace.append((2, name, {"vals": cands, "cells": cells, "elim": eliminated_from}))
                        return True
            
            # TODO: Handle "Hidden" Naked Triples (e.g. {1,2}, {1,3}, {2,3} in 3 cells) - subset logic
            # For now, let's stick to exact matches as it covers most cases and is simpler.
            # A full subset implementation would be: find N cells whose union of candidates has size N.
            
        return False

    def apply_hidden_pairs_triples(self):
        # Check all units
        for unit in self.units:
            counts = {} # val -> list of cell indices
            for idx in unit:
                if self.grid[idx] == 0:
                    for val in self.candidates[idx]:
                        if val not in counts: counts[val] = []
                        counts[val].append(idx)
            
            # Find candidates that appear in 2 or 3 cells
            possible_cands = {val: cells for val, cells in counts.items() if 2 <= len(cells) <= 3}
            
            # Check for combinations of candidates that share the same cells
            # Group by cell tuple
            cells_to_cands = {}
            for val, cells in possible_cands.items():
                cells_tuple = tuple(sorted(cells))
                if cells_tuple not in cells_to_cands: cells_to_cands[cells_tuple] = []
                cells_to_cands[cells_tuple].append(val)
            
            for cells_tuple, cands in cells_to_cands.items():
                if len(cands) == len(cells_tuple):
                    # Found Hidden Pair/Triple
                    # Eliminate other candidates from these cells
                    changed = False
                    eliminated_cands = []
                    for idx in cells_tuple:
                        original = self.candidates[idx].copy()
                        # Keep only the hidden tuple candidates
                        self.candidates[idx] = self.candidates[idx].intersection(set(cands))
                        if self.candidates[idx] != original:
                            eliminated_cands.append((idx, original - self.candidates[idx]))
                            changed = True
                    if changed:
                        name = "히든 페어 (Hidden Pair)" if len(cands) == 2 else "히든 트리플 (Hidden Triple)"
                        self.reason_trace.append((2, name, {"vals": cands, "cells": cells_tuple, "elim_details": eliminated_cands}))
                        return True
        return False

    def apply_x_wing(self):
        # Rows
        for val in range(1, 10):
            rows_with_2 = []
            for r in range(9):
                cols_with_val = []
                for c in range(9):
                    idx = r * 9 + c
                    if self.grid[idx] == 0 and val in self.candidates[idx]:
                        cols_with_val.append(c)
                if len(cols_with_val) == 2:
                    rows_with_2.append((r, cols_with_val))
            
            # Check for matching columns
            for i in range(len(rows_with_2)):
                for j in range(i + 1, len(rows_with_2)):
                    r1, cols1 = rows_with_2[i]
                    r2, cols2 = rows_with_2[j]
                    if cols1 == cols2:
                        # X-Wing found! Eliminate val from these columns in other rows
                        c1, c2 = cols1
                        changed = False
                        eliminated_from = []
                        for r in range(9):
                            if r != r1 and r != r2:
                                for c in [c1, c2]:
                                    idx = r * 9 + c
                                    if self.grid[idx] == 0 and val in self.candidates[idx]:
                                        self.candidates[idx].remove(val)
                                        eliminated_from.append(idx)
                                        changed = True
                        if changed:
                            self.reason_trace.append((3, "X-윙 (행) (X-Wing - Row)", {"val": val, "rows": [r1, r2], "cols": [c1, c2], "elim": eliminated_from}))
                            return True
                            
        # Cols
        for val in range(1, 10):
            cols_with_2 = []
            for c in range(9):
                rows_with_val = []
                for r in range(9):
                    idx = r * 9 + c
                    if self.grid[idx] == 0 and val in self.candidates[idx]:
                        rows_with_val.append(r)
                if len(rows_with_val) == 2:
                    cols_with_2.append((c, rows_with_val))
            
            # Check for matching rows
            for i in range(len(cols_with_2)):
                for j in range(i + 1, len(cols_with_2)):
                    c1, rows1 = cols_with_2[i]
                    c2, rows2 = cols_with_2[j]
                    if rows1 == rows2:
                        # X-Wing found! Eliminate val from these rows in other cols
                        r1, r2 = rows1
                        changed = False
                        eliminated_from = []
                        for c in range(9):
                            if c != c1 and c != c2:
                                for r in [r1, r2]:
                                    idx = r * 9 + c
                                    if self.grid[idx] == 0 and val in self.candidates[idx]:
                                        self.candidates[idx].remove(val)
                                        eliminated_from.append(idx)
                                        changed = True
                        if changed:
                            self.reason_trace.append((3, "X-윙 (열) (X-Wing - Col)", {"val": val, "cols": [c1, c2], "rows": [r1, r2], "elim": eliminated_from}))
                            return True
        return False

    def apply_y_wing(self):
        # Find pivot cell with 2 candidates (A, B)
        # Find pincers in same unit with (A, C) and (B, C)
        # Eliminate C from intersection of pincers
        bivalue_cells = [i for i in range(81) if self.grid[i] == 0 and len(self.candidates[i]) == 2]
        for pivot in bivalue_cells:
            cands = list(self.candidates[pivot])
            A, B = cands[0], cands[1]
            
            # Find potential pincers
            pincers_A = [] # Cells with A and C
            pincers_B = [] # Cells with B and C
            
            for peer in self.peers[pivot]:
                if peer in bivalue_cells:
                    p_cands = self.candidates[peer]
                    if A in p_cands and B not in p_cands:
                        pincers_A.append(peer)
                    elif B in p_cands and A not in p_cands:
                        pincers_B.append(peer)
            
            for pA in pincers_A:
                for pB in pincers_B:
                    # Check if they share a candidate C
                    candA = self.candidates[pA] - {A}
                    candB = self.candidates[pB] - {B}
                    if not candA or not candB: continue
                    C_A = list(candA)[0]
                    C_B = list(candB)[0]
                    
                    if C_A == C_B:
                        C = C_A
                        # Found Y-Wing: Pivot(AB), PincerA(AC), PincerB(BC) -> Eliminate C from common peers of PincerA and PincerB
                        common_peers = self.peers[pA].intersection(self.peers[pB])
                        changed = False
                        eliminated_from = []
                        for peer in common_peers:
                            if self.grid[peer] == 0 and C in self.candidates[peer]:
                                self.candidates[peer].remove(C)
                                eliminated_from.append(peer)
                                changed = True
                        if changed:
                            self.reason_trace.append((3, "Y-윙 (Y-Wing)", {"pivot": pivot, "pincers": [pA, pB], "val": C, "elim": eliminated_from}))
                            return True
        return False


    def solve_backtracking(self):
        # MRV: Find empty cell with fewest valid candidates
        empty = -1
        min_candidates = 10
        best_candidates = []
        
        for i in range(81):
            if not isinstance(self.grid, list):
                 raise TypeError(f"self.grid corrupted! Type: {type(self.grid)}")
            if self.grid[i] == 0:
                # Count valid candidates
                valid_cands = []
                for val in range(1, 10):
                    if self.is_valid(i, val):
                        valid_cands.append(val)
                
                if len(valid_cands) < min_candidates:
                    min_candidates = len(valid_cands)
                    empty = i
                    best_candidates = valid_cands
                    if min_candidates == 0: break # Impossible
                    if min_candidates == 1: break # Optimal
        
        if empty == -1:
            return True # Solved
        
        if min_candidates == 0:
            return False # No solution from this state
        
        for val in best_candidates:
            self.grid[empty] = val
            if self.solve_backtracking():
                return True
            self.grid[empty] = 0
        return False

    def is_valid(self, idx, val):
        row = idx // 9
        col = idx % 9
        box_r = (row // 3) * 3
        box_c = (col // 3) * 3
        
        # Check row
        for c in range(9):
            if self.grid[row * 9 + c] == val: return False
        # Check col
        for r in range(9):
            if self.grid[r * 9 + col] == val: return False
        # Check box
        start_row = (row // 3) * 3
        start_col = (col // 3) * 3
        for i in range(3):
            for j in range(3):
                cell_idx = (start_row + i) * 9 + (start_col + j)
                if self.grid[cell_idx] == val: return False
        return True

    def get_solution_str(self):
        print(f"Generating reasons for {ds['name']} ({store_path})...")
        
        with open(store_path, 'r', encoding='utf-8') as f_in, open(reason_path, 'w', encoding='utf-8') as f_out:
            reader = csv.reader(f_in)
            header = next(reader, None) # Skip header
            
            for i, row in enumerate(reader):
                if not row: continue
                puzzle = row[0]
                # solution = row[1]
                # stored_difficulty = int(row[2])
                
                grader = SudokuGrader(puzzle)
                diff = grader.grade()
                
                # Format reason
                # Find the highest difficulty technique used
                max_diff = 0
                max_tech = "없음"
                techs_used = set()
                detailed_log = []
                
                for d, t, details in grader.reason_trace:
                    techs_used.add(t)
                    if d > max_diff:
                        max_diff = d
                        max_tech = t
                    elif d == max_diff:
                        max_tech = t
                    
                    # Format details
                    detail_str = f"[{t}] "
                    if "cell" in details:
                        r, c = details["cell"] // 9 + 1, details["cell"] % 9 + 1
                        detail_str += f"R{r}C{c} = {details.get('val')}"
                    elif "elim" in details:
                        elim_cells = [f"R{i//9+1}C{i%9+1}" for i in details["elim"]]
                        detail_str += f"제거: {details.get('val')} @ {', '.join(elim_cells)}"
                    elif "elim_details" in details:
                         # For hidden pairs/triples
                         elim_info = []
                         for idx, cands in details["elim_details"]:
                             r, c = idx // 9 + 1, idx % 9 + 1
                             elim_info.append(f"R{r}C{c}-{list(cands)}")
                         detail_str += f"제거: {', '.join(elim_info)}"
                    
                    detailed_log.append(detail_str)
                
                reason_str = f"퍼즐 {i+1}: 난이도 {diff}\n"
                reason_str += f"  - 최대 난이도 도달 원인: {max_diff} ({max_tech})\n"
                reason_str += f"  - 사용된 기법: {', '.join(sorted(list(techs_used)))}\n"
                reason_str += "  - 상세 로그:\n"
                for log in detailed_log:
                    reason_str += f"    * {log}\n"
                
                if diff == 4:
                     reason_str += "  - 참고: 현재 구현된 고급 기술로는 풀 수 없어 전문가(Expert) 전략이 필요합니다.\n"
                reason_str += "\n"
                
                f_out.write(reason_str)
                
                if (i + 1) % 100 == 0:
                    print(f"Processed {i + 1} reasons")

def process_dataset(ds, limit=1000):
    base_dir = 'd:/android/Projects/Sudoku'
    sudoku_path = os.path.join(base_dir, ds['sudoku'])
    solve_path = os.path.join(base_dir, ds['solve']) if ds['solve'] else None
    
    safe_name = ds['name'].lower().replace(' ', '_')
    output_path = os.path.join(base_dir, 'data', f"{safe_name}.store")
    
    if not os.path.exists(os.path.dirname(output_path)):
        os.makedirs(os.path.dirname(output_path))

    if not os.path.exists(sudoku_path):
        print(f"Dataset file not found: {sudoku_path}")
        return

    print(f"Processing {ds['name']} -> {output_path} (limit={limit})...", flush=True)
    
    counts = {0:0, 1:0, 2:0, 3:0, 4:0}

    try:
        with open(sudoku_path, 'r', encoding='utf-8') as f_puz, \
             open(output_path, 'w', newline='', encoding='utf-8') as f_out:
            
            writer = csv.writer(f_out)
            writer.writerow(['puzzle', 'solution', 'difficulty'])
            
            f_sol = None
            if solve_path and os.path.exists(solve_path):
                f_sol = open(solve_path, 'r', encoding='utf-8')
            
            try:
                for i, p in enumerate(f_puz):
                    if i >= limit: break
                    p = p.strip()
                    if not p: continue
                    
                    s = None
                    if f_sol:
                        s = f_sol.readline()
                        if s: s = s.strip()
                    
                    try:
                        grader = SudokuGrader(p)
                        diff = grader.grade()
                        counts[diff] += 1
                        
                        final_solution = ""
                        if s:
                            final_solution = s
                        else:
                            if not grader.is_solved():
                                if not grader.solve_backtracking():
                                    pass
                            final_solution = grader.get_solution_str()
                        
                        writer.writerow([p, final_solution, diff])
                        
                        if (i + 1) % 100 == 0:
                            print(f"Processed {i + 1} puzzles", flush=True)
                    except Exception as e:
                        # import traceback
                        # traceback.print_exc()
                        print(f"Error processing puzzle {i+1}: {e}")
            finally:
                if f_sol: f_sol.close()
                
    except Exception as e:
        print(f"Error opening files for {ds['name']}: {e}")
        return
    
    print(f"Finished {ds['name']}. Distribution: {counts}", flush=True)

def summarize_difficulties():
    base_dir = 'd:/android/Projects/Sudoku'
    data_dir = os.path.join(base_dir, 'data')
    
    total_counts = {0:0, 1:0, 2:0, 3:0, 4:0}
    dataset_stats = {}
    
    print(f"{'Dataset':<20} | {'Beg':<5} | {'Nov':<5} | {'Int':<5} | {'Adv':<5} | {'Exp':<5} | {'Total':<5}")
    print("-" * 75)
    
    for filename in os.listdir(data_dir):
        if not filename.endswith('.store'): continue
        
        filepath = os.path.join(data_dir, filename)
        ds_counts = {0:0, 1:0, 2:0, 3:0, 4:0}
        
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                reader = csv.reader(f)
                next(reader, None) # Skip header
                for row in reader:
                    if not row: continue
                    try:
                        diff = int(row[2])
                        ds_counts[diff] += 1
                        total_counts[diff] += 1
                    except (ValueError, IndexError):
                        continue
        except Exception as e:
            print(f"Error reading {filename}: {e}")
            continue
            
        total = sum(ds_counts.values())
        name = filename.replace('.store', '').replace('_', ' ').title()
        print(f"{name:<20} | {ds_counts[0]:<5} | {ds_counts[1]:<5} | {ds_counts[2]:<5} | {ds_counts[3]:<5} | {ds_counts[4]:<5} | {total:<5}")
        dataset_stats[name] = ds_counts

    print("-" * 75)
    total_all = sum(total_counts.values())
    print(f"{'TOTAL':<20} | {total_counts[0]:<5} | {total_counts[1]:<5} | {total_counts[2]:<5} | {total_counts[3]:<5} | {total_counts[4]:<5} | {total_all:<5}")

def mine_advanced(target_count=1000):
    base_dir = 'd:/android/Projects/Sudoku'
    sudoku_path = os.path.join(base_dir, 'Hard/Hard.sudoku')
    solve_path = os.path.join(base_dir, 'Hard/Hard.solve')
    output_path = os.path.join(base_dir, 'data', 'advanced_mined.store')
    
    print(f"Mining Advanced puzzles from {sudoku_path} -> {output_path} (target={target_count})...", flush=True)
    
    found_count = 0
    processed_count = 0
    
    try:
        with open(sudoku_path, 'r', encoding='utf-8') as f_puz, \
             open(solve_path, 'r', encoding='utf-8') as f_sol, \
             open(output_path, 'w', newline='', encoding='utf-8') as f_out:
            
            writer = csv.writer(f_out)
            writer.writerow(['puzzle', 'solution', 'difficulty'])
            
            for p, s in zip(f_puz, f_sol):
                p = p.strip()
                s = s.strip()
                if not p: continue
                
                processed_count += 1
                try:
                    grader = SudokuGrader(p)
                    diff = grader.grade()
                    
                    if diff == 3: # Advanced
                        writer.writerow([p, s, diff])
                        found_count += 1
                        if found_count % 10 == 0:
                            print(f"Found {found_count} Advanced puzzles (scanned {processed_count})", flush=True)
                        
                        if found_count >= target_count:
                            break
                except Exception:
                    continue
                    
    except Exception as e:
        print(f"Error mining: {e}")
        return

    print(f"Finished mining. Found {found_count} Advanced puzzles after scanning {processed_count}.", flush=True)

def consolidate_datasets(target_per_diff=1000):
    import random
    base_dir = 'd:/android/Projects/Sudoku'
    data_dir = os.path.join(base_dir, 'data')
    output_path = os.path.join(data_dir, 'combined_balanced.store')
    
    print(f"Consolidating datasets into {output_path} (target={target_per_diff} per difficulty)...", flush=True)
    
    buckets = {0: [], 1: [], 2: [], 3: [], 4: []}
    seen_puzzles = set()
    
    # Read all .store files
    for filename in os.listdir(data_dir):
        if not filename.endswith('.store') or filename == 'combined_balanced.store': 
            continue
            
        filepath = os.path.join(data_dir, filename)
        print(f"  Reading {filename}...", flush=True)
        
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                reader = csv.reader(f)
                next(reader, None) # Skip header
                for row in reader:
                    if not row: continue
                    try:
                        p = row[0]
                        s = row[1]
                        diff = int(row[2])
                        
                        if p not in seen_puzzles:
                            if diff in buckets:
                                buckets[diff].append((p, s, diff))
                                seen_puzzles.add(p)
                    except (ValueError, IndexError):
                        continue
        except Exception as e:
            print(f"  Error reading {filename}: {e}")
            continue

    # Select and write
    print("  Balancing and writing...", flush=True)
    total_written = 0
    
    with open(output_path, 'w', newline='', encoding='utf-8') as f_out:
        writer = csv.writer(f_out)
        writer.writerow(['puzzle', 'solution', 'difficulty'])
        
        for diff in range(5):
            items = buckets[diff]
            random.shuffle(items)
            selected = items[:target_per_diff]
            
            print(f"    Difficulty {diff}: Found {len(items)}, Selected {len(selected)}")
            
            for item in selected:
                writer.writerow(item)
                total_written += 1
                
    print(f"Finished consolidation. Total puzzles: {total_written}", flush=True)

def convert_to_sqlite():
    import sqlite3
    base_dir = 'd:/android/Projects/Sudoku'
    data_dir = os.path.join(base_dir, 'data')
    csv_path = os.path.join(data_dir, 'combined_balanced.store')
    db_path = os.path.join(data_dir, 'sudoku.db')
    
    if not os.path.exists(csv_path):
        print(f"CSV file not found: {csv_path}")
        return

    print(f"Converting {csv_path} to SQLite DB {db_path}...", flush=True)
    
    # Remove existing DB if any
    if os.path.exists(db_path):
        os.remove(db_path)
        
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Create table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS puzzles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            puzzle TEXT NOT NULL,
            solution TEXT,
            difficulty INTEGER
        )
    ''')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_difficulty ON puzzles(difficulty)')
    
    # Read CSV and insert
    inserted_count = 0
    try:
        with open(csv_path, 'r', encoding='utf-8') as f:
            reader = csv.reader(f)
            next(reader, None) # Skip header
            
            rows_to_insert = []
            for row in reader:
                if not row: continue
                try:
                    p = row[0]
                    s = row[1]
                    d = int(row[2])
                    rows_to_insert.append((p, s, d))
                except (ValueError, IndexError):
                    continue
            
            cursor.executemany('INSERT INTO puzzles (puzzle, solution, difficulty) VALUES (?, ?, ?)', rows_to_insert)
            inserted_count = len(rows_to_insert)
            conn.commit()
            
    except Exception as e:
        print(f"Error converting to SQLite: {e}")
    finally:
        conn.close()
        
    print(f"Finished conversion. Inserted {inserted_count} rows into sudoku.db", flush=True)

def sanitize_db():
    import sqlite3
    base_dir = 'd:/android/Projects/Sudoku'
    data_dir = os.path.join(base_dir, 'data')
    db_path = os.path.join(data_dir, 'sudoku.db')
    
    if not os.path.exists(db_path):
        print(f"DB file not found: {db_path}")
        return

    print(f"Sanitizing {db_path} (replacing '.' with '0')...", flush=True)
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check count before
        # cursor.execute("SELECT COUNT(*) FROM puzzles WHERE puzzle LIKE '%.%'")
        # count_before = cursor.fetchone()[0]
        # print(f"  Rows with '.' before: {count_before}")
        
        cursor.execute("UPDATE puzzles SET puzzle = REPLACE(puzzle, '.', '0')")
        affected = cursor.rowcount
        conn.commit()
        
        print(f"  Updated {affected} rows.")
        
    except Exception as e:
        print(f"Error sanitizing DB: {e}")
    finally:
        if conn: conn.close()
        
    print("Finished sanitization.", flush=True)

def main():
    # mode = 'single_dataset'
    # mode = 'all_store' 
    # mode = 'all_reason'
    # mode = 'summary'
    # mode = 'mine_advanced'
    # mode = 'consolidate'
    # mode = 'to_sqlite'
    mode = 'sanitize'
    
    if mode == 'sanitize':
        sanitize_db()
        return

    if mode == 'to_sqlite':
        convert_to_sqlite()
        return

    if mode == 'consolidate':
        consolidate_datasets()
        return

    if mode == 'mine_advanced':
        mine_advanced()
        return

    if mode == 'summary':
        summarize_difficulties()
        return
    
    if mode == 'all_store':
        for ds in DATASETS:
            try:
                process_dataset(ds)
            except Exception as e:
                print(f"CRITICAL ERROR processing dataset {ds['name']}: {e}", flush=True)
        return

    if mode == 'all_reason':
        generate_reasons()
        return

if __name__ == '__main__':
    main()
