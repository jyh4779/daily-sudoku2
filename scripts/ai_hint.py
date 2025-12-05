import sys
import os

# Add current directory to path to import process_sudoku
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from process_sudoku import SudokuGrader

class SudokuHintGenerator:
    def __init__(self, puzzle_str):
        self.grader = SudokuGrader(puzzle_str)
        # Ensure candidates are initialized
        # SudokuGrader __init__ does this:
        # self.candidates = [set(range(1, 10)) if x == 0 else set() for x in self.grid]
        # and then calls eliminate_candidates for initial values.
        
    def get_candidates(self):
        """
        Returns the current candidates for all cells.
        """
        return self.grader.candidates

    def get_next_hint(self):
        """
        Finds the next logical step based on the prioritized techniques.
        Returns a dictionary with hint details or None if no step is found.
        """
        # 1. Single Candidate / Naked Single
        if self.grader.apply_naked_single():
            return self._get_last_reason_and_revert()

        # 2. Unique Candidate / Hidden Single
        # Check Row/Col first (as per user request "Hidden Single" usually implies unit check)
        # The user request separates them but puts "Hidden Single" as step 2.
        # process_sudoku separates block vs row/col. I will check all.
        if self.grader.apply_hidden_single_row_col():
            return self._get_last_reason_and_revert()
        if self.grader.apply_hidden_single_block():
            return self._get_last_reason_and_revert()

        # 3. Pairs / Triples
        if self.grader.apply_naked_pairs_triples():
            return self._get_last_reason_and_revert()
        if self.grader.apply_hidden_pairs_triples():
            return self._get_last_reason_and_revert()

        # 4. Box-Line Interaction (Locked Candidates)
        if self.grader.apply_locked_candidates():
            return self._get_last_reason_and_revert()

        # 5. Advanced Techniques
        if self.grader.apply_x_wing():
            return self._get_last_reason_and_revert()
        if self.grader.apply_y_wing():
            return self._get_last_reason_and_revert()

        return None

    def _get_last_reason_and_revert(self):
        """
        Helper to extract the last reason from grader and revert the change 
        (since we only want to suggest the step, not permanently apply it if we were keeping state,
        but for this script we just output the hint. However, SudokuGrader modifies state in place.
        If we want to show 'current candidates' BEFORE the move, we might need them.
        Actually, the user wants 'Next Step'. 
        The SudokuGrader records the reason in self.reason_trace.
        """
        if not self.grader.reason_trace:
            return None
        
        # Get the last reason
        difficulty, tech_name, details = self.grader.reason_trace[-1]
        
        # We don't necessarily need to revert if the script ends here, 
        # but if we were to continue finding more hints, we would.
        # For this specific request "Next Step Only", we just return this.
        return {
            "difficulty": difficulty,
            "tech_name": tech_name,
            "details": details
        }

    def format_hint(self, hint_data, level='standard', show_coords=True):
        if not hint_data:
            return "더 이상 가능한 논리적 단계가 없거나, 이미 해결되었습니다."

        tech_name = hint_data['tech_name']
        details = hint_data['details']
        
        # Parse tech name to get English/Korean parts if needed, 
        # but SudokuGrader already provides mixed strings like "네이키드 싱글 (Naked Single)"
        
        msg = f"현재 가능한 다음 수:\n"
        
        # Formatting based on technique type
        if "Naked Single" in tech_name:
            cell = details['cell']
            val = details['val']
            r, c = cell // 9 + 1, cell % 9 + 1
            msg += f"- R{r}C{c} 에 {val}를 배치 가능.\n"
            if level == 'beginner':
                msg += f"  이유: 이 칸(행 {r}, 열 {c})에 들어갈 수 있는 숫자가 {val} 하나뿐입니다.\n"
                msg += f"  (다른 숫자들은 이미 같은 행, 열, 또는 박스에 존재하여 불가능합니다.)"
            else:
                msg += f"  이유: 행 {r}, 열 {c}, 박스에서 후보가 {val} 하나뿐인 Naked Single."

        elif "Hidden Single" in tech_name:
            cell = details['cell']
            val = details['val']
            r, c = cell // 9 + 1, cell % 9 + 1
            
            unit_type = ""
            if "Row" in tech_name: unit_type = f"행 {details['row'] + 1}"
            elif "Col" in tech_name: unit_type = f"열 {details['col'] + 1}"
            elif "Block" in tech_name: unit_type = f"박스 {details['box'] + 1}"
            
            msg += f"- {unit_type}에서 숫자 {val}은(는) R{r}C{c} 위치에만 올 수 있음.\n"
            if level == 'beginner':
                msg += f"  이유: {unit_type}를 살펴보면, 숫자 {val}이 들어갈 수 있는 빈칸이 이 곳 하나뿐입니다."
            else:
                msg += f"  이유: {unit_type}에서 {val}에 대한 Hidden Single."

        elif "Naked Pair" in tech_name or "Naked Triple" in tech_name:
            cells = details['cells']
            vals = details['vals']
            elim = details['elim']
            
            cell_coords = [f"R{i//9+1}C{i%9+1}" for i in cells]
            elim_coords = [f"R{i//9+1}C{i%9+1}" for i in elim]
            
            msg += f"- {', '.join(cell_coords)} 칸들에 후보 {vals}가 묶여 있음 ({tech_name}).\n"
            msg += f"- 결과: {', '.join(elim_coords)} 에서 후보 {vals} 제거 가능."

        elif "Hidden Pair" in tech_name or "Hidden Triple" in tech_name:
            cells = details['cells']
            vals = details['vals']
            
            cell_coords = [f"R{i//9+1}C{i%9+1}" for i in cells]
            
            msg += f"- {', '.join(cell_coords)} 칸들에서만 숫자 {vals}가 등장함 ({tech_name}).\n"
            msg += f"- 결과: 이 칸들에서 {vals}를 제외한 다른 후보들을 모두 제거합니다."

        elif "Pointing" in tech_name or "Claiming" in tech_name:
            # Box-Line Interaction
            val = details['val']
            elim = details['elim']
            elim_coords = [f"R{i//9+1}C{i%9+1}" for i in elim]
            
            type_str = "포인팅" if "Pointing" in tech_name else "클레임"
            
            msg += f"- 숫자 {val}에 대한 {type_str} (Box-Line Interaction).\n"
            msg += f"- 결과: {', '.join(elim_coords)} 에서 후보 {val} 제거."

        elif "X-Wing" in tech_name:
            val = details['val']
            elim = details['elim']
            elim_coords = [f"R{i//9+1}C{i%9+1}" for i in elim]
            msg += f"- 숫자 {val}에 대한 X-Wing 발견.\n"
            msg += f"- 결과: {', '.join(elim_coords)} 에서 후보 {val} 제거."
            
        elif "Y-Wing" in tech_name:
            pivot = details['pivot']
            pincers = details['pincers']
            val = details['val']
            elim = details['elim']
            elim_coords = [f"R{i//9+1}C{i%9+1}" for i in elim]
            
            r_p, c_p = pivot // 9 + 1, pivot % 9 + 1
            
            msg += f"- Y-Wing 발견 (피벗: R{r_p}C{c_p}).\n"
            msg += f"- 결과: {', '.join(elim_coords)} 에서 후보 {val} 제거."

        else:
            # Fallback
            msg += f"- {tech_name} 적용 가능.\n"
            msg += f"  상세: {details}"

        return msg

def print_candidates(candidates):
    print("\n[현재 후보 숫자 목록]")
    for r in range(9):
        row_str = ""
        for c in range(9):
            idx = r * 9 + c
            cands = candidates[idx]
            if not cands:
                row_str += "{.} ".ljust(12)
            else:
                cands_str = "".join(str(x) for x in sorted(list(cands)))
                row_str += f"{{{cands_str}}} ".ljust(12)
        print(row_str)

if __name__ == "__main__":
    # Example usage
    # This is a sample puzzle string (dots or 0s for empty)
    # Hard puzzle example
    sample_puzzle = "000000000002060100800503009060090070504602301003000900706819503410000098000000000"
    
    if len(sys.argv) > 1:
        sample_puzzle = sys.argv[1]

    print(f"입력 퍼즐: {sample_puzzle}")
    
    generator = SudokuHintGenerator(sample_puzzle)
    
    # Option to print candidates
    # print_candidates(generator.get_candidates())
    
    hint = generator.get_next_hint()
    
    if hint:
        print("\n" + "="*40)
        print(generator.format_hint(hint, level='standard'))
        print("="*40 + "\n")
        
        # Also print beginner explanation for demo
        print("[초보자용 설명 예시]")
        print(generator.format_hint(hint, level='beginner'))
    else:
        print("힌트를 찾을 수 없습니다. (이미 풀렸거나, 구현된 논리 범위를 벗어남)")
