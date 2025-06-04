// calculator.js

export const calculatorAppDefinition = {
    title: "Calculator",
    icon: "./calculator-0.png",
    defaultWidth: 375, 
    defaultHeight: 280, 
    content: () => {
        const baseBtnStyle = "border: 1px outset #dfdfdf; background: #c0c0c0; font-size:10px; padding:1px; text-align:center; height: 22px; box-sizing: border-box; user-select:none;";
        const funcBtnStyle = `${baseBtnStyle} color:#500079;`;
        const opBtnStyle = `${baseBtnStyle} color:red;`;
        const memBtnStyle = `${baseBtnStyle} color:blue;`;
        const numBtnStyle = `${baseBtnStyle} color:black;`;
        const disabledBtnStyle = `${baseBtnStyle} color:#707070; cursor:default;`; // Adjusted gray for better visibility on C0C0C0

        const createButton = (id, text, style, extras = "", dataset = {}) => {
            let dataAttributes = '';
            for (const key in dataset) {
                dataAttributes += ` data-${key}="${dataset[key]}"`;
            }
            // If style is disabledBtnStyle, ensure 'disabled' is in extras
            if (style === disabledBtnStyle && !extras.includes('disabled')) {
                extras = extras ? `${extras} disabled` : 'disabled';
            }
            return `<button id="calc-${id}" style="${style}" ${extras} ${dataAttributes}>${text}</button>`;
        }
        
        const createRadio = (groupName, value, label, checked = false) => `
            <label style="font-size:10px; margin-right:3px; display:inline-flex; align-items:center; user-select:none;">
                <input type="radio" name="${groupName}" value="${value}" ${checked ? 'checked' : ''} style="vertical-align:middle; margin-right:1px; height:10px; width:10px;">${label}
            </label>`;
        const createCheckbox = (id, name, label) => `
            <label style="font-size:10px; margin-right:4px; margin-left:1px; display:inline-flex; align-items:center; user-select:none;">
                <input type="checkbox" id="calc-${id}" name="${name}" style="vertical-align:middle; margin-right:1px; height:10px; width:10px;">${label}
            </label>`;

        return `
            <div id="calculator-app" style="display: flex; flex-direction: column; height: 100%; background: #c0c0c0; padding: 3px; font-family: 'MS Sans Serif', Tahoma, Arial; font-size:11px; box-sizing: border-box;">
                <div style="padding: 0px 3px 2px 3px; margin-bottom:3px; color: #808080;">
                  <span style="margin-right: 6px; display: inline-block;">
                    <u>E</u>dit
                  </span>
                  <span style="margin-right: 6px; display: inline-block;">
                    <u>V</u>iew 
                  </span>
                  <span style="margin-right: 6px; display: inline-block;">
                    <u>H</u>elp
                  </span>
                </div>
                <input type="text" id="calc-display" value="0." style="width: 100%; margin-bottom: 5px; text-align: right; padding: 2px 5px; border: 1px inset #808080; background: white; height:28px; box-sizing:border-box; font-size:14px; font-family: 'Lucida Console', monospace;">

                <div style="display: flex; justify-content: space-between; margin-bottom: 5px; padding: 0 0px;">
                    <div style="border: 1px groove #808080; padding: 2px 3px 1px 3px; display:flex;" id="calc-base-group">
                        ${createRadio("base", "hex", "Hex")}
                        ${createRadio("base", "dec", "Dec", true)}
                        ${createRadio("base", "oct", "Oct")}
                        ${createRadio("base", "bin", "Bin")}
                    </div>
                    <div style="border: 1px groove #808080; padding: 2px 3px 1px 3px; display:flex; margin-left:3px;" id="calc-angle-group">
                        ${createRadio("angle", "deg", "Degrees", true)}
                        ${createRadio("angle", "rad", "Radians")}
                        ${createRadio("angle", "grad", "Gradients")}
                    </div>
                </div>

                <div class="calc-button-area" style="display: flex; flex-direction: column; gap: 3px; flex-grow:1;">
                    <div class="calc-top-row-controls" style="display: grid; grid-template-columns: auto auto 1fr auto auto auto; gap: 3px; height:22px;">
                        ${createCheckbox("inv", "inv", "Inv")}
                        ${createCheckbox("hyp", "hyp", "Hyp")}
                        <div></div> <!-- Placeholder for spacing -->
                        ${createButton("backspace", "Backspace", opBtnStyle)}
                        ${createButton("ce", "CE", opBtnStyle)}
                        ${createButton("c", "C", opBtnStyle)}
                    </div>

                    <div class="calc-main-grid" style="display: grid; grid-template-columns: repeat(11, 1fr); gap: 3px; flex-grow: 1;">
                        ${createButton("sta", "Sta", disabledBtnStyle)} ${createButton("fe", "F-E", disabledBtnStyle)} ${createButton("lparen", "(", disabledBtnStyle)} ${createButton("rparen", ")", disabledBtnStyle)} ${createButton("mc", "MC", memBtnStyle, "", {action:"memory", value:"mc"})} 
                        ${createButton("7", "7", numBtnStyle, "", {action:"digit", value:"7"})} ${createButton("8", "8", numBtnStyle, "", {action:"digit", value:"8"})} ${createButton("9", "9", numBtnStyle, "", {action:"digit", value:"9"})} ${createButton("div", "/", opBtnStyle, "", {action:"operator", value:"/"})} ${createButton("mod", "Mod", funcBtnStyle, "", {action:"operator", value:"mod"})} ${createButton("and", "And", disabledBtnStyle)}
                        
                        ${createButton("ave", "Ave", disabledBtnStyle)} ${createButton("dms", "dms", disabledBtnStyle)} ${createButton("exp", "Exp", disabledBtnStyle)} ${createButton("ln", "ln", funcBtnStyle, "", {action:"unary", value:"ln"})} ${createButton("mr", "MR", memBtnStyle, "", {action:"memory", value:"mr"})}
                        ${createButton("4", "4", numBtnStyle, "", {action:"digit", value:"4"})} ${createButton("5", "5", numBtnStyle, "", {action:"digit", value:"5"})} ${createButton("6", "6", numBtnStyle, "", {action:"digit", value:"6"})} ${createButton("mul", "*", opBtnStyle, "", {action:"operator", value:"*"})} ${createButton("or", "Or", disabledBtnStyle)} ${createButton("xor", "Xor", disabledBtnStyle)}
                        
                        ${createButton("sum", "Sum", disabledBtnStyle)} ${createButton("sin", "sin", funcBtnStyle, "", {action:"unary", value:"sin"})} ${createButton("powy", "x^y", funcBtnStyle, "", {action:"operator", value:"powy"})} ${createButton("log", "log", funcBtnStyle, "", {action:"unary", value:"log"})} ${createButton("ms", "MS", memBtnStyle, "", {action:"memory", value:"ms"})}
                        ${createButton("1", "1", numBtnStyle, "", {action:"digit", value:"1"})} ${createButton("2", "2", numBtnStyle, "", {action:"digit", value:"2"})} ${createButton("3", "3", numBtnStyle, "", {action:"digit", value:"3"})} ${createButton("sub", "-", opBtnStyle, "", {action:"operator", value:"-"})} ${createButton("lsh", "Lsh", disabledBtnStyle)} ${createButton("not", "Not", disabledBtnStyle)}
                        
                        ${createButton("s", "s", disabledBtnStyle)} ${createButton("cos", "cos", funcBtnStyle, "", {action:"unary", value:"cos"})} ${createButton("pow3", "x^3", funcBtnStyle, "", {action:"unary", value:"pow3"})} ${createButton("fact", "n!", funcBtnStyle, "", {action:"unary", value:"fact"})} ${createButton("mplus", "M+", memBtnStyle, "", {action:"memory", value:"mplus"})}
                        ${createButton("0", "0", numBtnStyle, "", {action:"digit", value:"0"})} ${createButton("neg", "+/-", numBtnStyle, "", {action:"unary", value:"neg"})} ${createButton("dot", ".", numBtnStyle, "", {action:"digit", value:"."})} ${createButton("add", "+", opBtnStyle, "", {action:"operator", value:"+"})} 
                        ${createButton("eq", "=", opBtnStyle, "", {action:"equals"})} 
                        ${createButton("int", "Int", funcBtnStyle, "", {action:"unary", value:"int"})}
                        
                        ${createButton("dat", "Dat", disabledBtnStyle)} ${createButton("tan", "tan", funcBtnStyle, "", {action:"unary", value:"tan"})} ${createButton("pow2", "x^2", funcBtnStyle, "", {action:"unary", value:"pow2"})} ${createButton("recip", "1/x", funcBtnStyle, "", {action:"unary", value:"recip"})} ${createButton("pi", "pi", memBtnStyle, "", {action:"pi"})}
                        ${createButton("A", "A", numBtnStyle, "disabled", {action:"digit", value:"A", base:"hex"})} ${createButton("B", "B", numBtnStyle, "disabled", {action:"digit", value:"B", base:"hex"})} ${createButton("C", "C", numBtnStyle, "disabled", {action:"digit", value:"C", base:"hex"})} ${createButton("D", "D", numBtnStyle, "disabled", {action:"digit", value:"D", base:"hex"})} 
                        ${createButton("E", "E", numBtnStyle, "disabled", {action:"digit", value:"E", base:"hex"})} 
                        ${createButton("F", "F", numBtnStyle, "disabled", {action:"digit", value:"F", base:"hex"})}
                    </div>
                </div>
            </div>
        `;
    },
    initApp: (windowEl) => {
        const display = windowEl.querySelector('#calc-display');
        const buttons = windowEl.querySelectorAll('.calc-main-grid button, .calc-top-row-controls button');
        const baseRadios = windowEl.querySelectorAll('input[name="base"]');
        const angleRadios = windowEl.querySelectorAll('input[name="angle"]');
        const invCheckbox = windowEl.querySelector('#calc-inv');
        const hypCheckbox = windowEl.querySelector('#calc-hyp');

        let currentInput = "0";
        let previousInput = "";
        let operator = null;
        let memoryValue = 0;
        let shouldResetDisplay = true;
        let currentBase = 10; // dec
        let currentAngleMode = "deg"; // deg, rad, grad
        let errorState = false;
        const MAX_DISPLAY_LENGTH = 20; 

        const validDigitsForBase = {
            16: "0123456789ABCDEF",
            10: "0123456789.",
            8: "01234567",
            2: "01"
        };
        buttons.forEach(button => {
            button.addEventListener('click', () => {
                if (button.disabled) return; // Check if button is HTML-disabled

                const action = button.dataset.action;
                const value = button.dataset.value;

                switch (action) {
                    case "digit": handleDigit(value); break;
                    case "operator": handleOperator(value); break;
                    case "equals": handleEquals(); break;
                    case "unary": handleUnary(value); break;
                    case "memory": handleMemory(value); break;
                    case "pi": handlePi(); break;
                    // No "unimplemented" case needed as they are disabled
                }
                if (button.id === "calc-c") resetCalculator();
                else if (button.id === "calc-ce") clearEntry();
                else if (button.id === "calc-backspace") backspace();
            });
        });

        baseRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                if (e.target.checked) {
                    let baseVal = 10;
                    if (e.target.value === 'hex') baseVal = 16;
                    else if (e.target.value === 'oct') baseVal = 8;
                    else if (e.target.value === 'bin') baseVal = 2;
                    changeBase(baseVal);
                }
            });
        });

        angleRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                if (e.target.checked) currentAngleMode = e.target.value;
            });
        });

        windowEl.addEventListener('keydown', (event) => {
            // If the window is not active (e.g., another window is on top), don't process keys.
            // This check is implicitly handled because the event listener is on windowEl,
            // and app.js focuses windowEl when it becomes active.
            // However, if an input *inside* the calculator had focus, this might still fire.
            // For this simple calculator, it's okay.

            let handled = true; // Assume handled, set to false if not.

            if (event.key >= '0' && event.key <= '9') {
                handleDigit(event.key);
            } else if (currentBase === 16 && event.key.length === 1 && event.key.match(/[a-f]/i)) {
                handleDigit(event.key.toUpperCase());
            } else {
                switch (event.key) {
                    case '.':
                        if (currentBase === 10) handleDigit('.');
                        else handled = false;
                        break;
                    case '+': handleOperator('+'); break;
                    case '-': handleOperator('-'); break;
                    case '*': handleOperator('*'); break;
                    case '/': handleOperator('/'); break;
                    case '%': handleOperator('mod'); break; // Shift+5 typically
                    case '=':
                    case 'Enter':
                        handleEquals();
                        break;
                    case 'Backspace':
                        backspace();
                        break;
                    case 'Escape': // Typically CE or C. Let's map to CE.
                        clearEntry();
                        break;
                    case 'Delete': // Map to C (All Clear)
                        resetCalculator();
                        break;
                    // Add more direct function mappings if desired, e.g., 'p' for pi
                    // Be cautious with single letter keys that might conflict with typing if an input field was present.
                    default:
                        handled = false; // Key was not handled by the calculator
                        break;
                }
            }

            if (handled) {
                event.preventDefault(); // Prevent default browser action for handled keys
            }
        });
        resetCalculator(); 

        windowEl.querySelector('#calc-dot').disabled = false; // Default for base 10
        ['A','B','C','D','E','F'].forEach(hexDigit => {
            const btn = windowEl.querySelector(`#calc-${hexDigit}`);
            if (btn) btn.disabled = true; // Default for base 10
        });
        

        function updateDisplay(value) {
            if (errorState) {
                display.value = "Error";
                return;
            }
            let displayStr = String(value);
            if (displayStr.length > MAX_DISPLAY_LENGTH) {
                if (currentBase === 10 && Math.abs(parseFloat(displayStr)) > 1e-5) { 
                    const num = parseFloat(displayStr);
                    if (Math.abs(num) >= 1e15 || (Math.abs(num) < 1e-4 && num !== 0)) {
                         displayStr = num.toExponential(MAX_DISPLAY_LENGTH - 7); 
                    }
                }
                if (displayStr.length > MAX_DISPLAY_LENGTH) {
                    displayStr = displayStr.substring(0, MAX_DISPLAY_LENGTH);
                }
            }
            display.value = displayStr;
        }
        
        function resetCalculator() {
            currentInput = "0";
            previousInput = "";
            operator = null;
            shouldResetDisplay = true;
            errorState = false;
            updateDisplay(currentInput);
        }

        function clearEntry() {
            if (errorState) {
                resetCalculator();
                return;
            }
            currentInput = "0";
            shouldResetDisplay = true;
            updateDisplay(currentInput);
        }

        function backspace() {
            if (errorState) {
                resetCalculator();
                return;
            }
            if (currentInput.length > 1) {
                currentInput = currentInput.slice(0, -1);
            } else {
                currentInput = "0";
                shouldResetDisplay = true;
            }
            updateDisplay(currentInput);
        }

        function parseInput(inputStr) {
            if (currentBase === 10) return parseFloat(inputStr);
            // For non-decimal bases, ensure we are parsing integers.
            // If inputStr has a '.', it's likely from a previous base-10 operation.
            // We should truncate or handle it. For now, parseInt will ignore post-'.'
            return parseInt(inputStr, currentBase);
        }

        function formatOutput(num) {
            if (errorState) return "Error";
            if (currentBase === 10) {
                let s = String(num);
                if (s.includes('.') && s.length > MAX_DISPLAY_LENGTH) {
                    const precision = MAX_DISPLAY_LENGTH - s.indexOf('.') - 1;
                    if (precision > 0 && precision < 15) { // Avoid excessive toFixed precision
                        s = num.toFixed(Math.min(precision, 10)); 
                    } else if (s.length > MAX_DISPLAY_LENGTH) { // If still too long or precision is not good
                        s = num.toExponential(MAX_DISPLAY_LENGTH - 7);
                    }
                }
                return s;
            }
            return Math.trunc(num).toString(currentBase).toUpperCase();
        }
        
        function calculate() {
            if (operator === null || previousInput === "" || errorState) return false;

            let prev = parseInput(previousInput);
            let curr = parseInput(currentInput);
            let result;

            switch (operator) {
                case "+": result = prev + curr; break;
                case "-": result = prev - curr; break;
                case "*": result = prev * curr; break;
                case "/": 
                    if (curr === 0) { errorState = true; result = 0; }
                    else result = prev / curr;
                    break;
                case "mod":
                    if (curr === 0) { errorState = true; result = 0; }
                    else result = prev % curr;
                    break;
                case "powy": result = Math.pow(prev, curr); break;
                default: return false;
            }
            
            if (isNaN(result) || !isFinite(result)) {
                errorState = true;
            }

            currentInput = formatOutput(result);
            operator = null;
            // previousInput = ""; // Let's keep previousInput for repeated equals with last operand
            shouldResetDisplay = true;
            updateDisplay(currentInput);
            return true;
        }

        function handleDigit(digit) {
            if (errorState) resetCalculator();
            if (currentInput.length >= MAX_DISPLAY_LENGTH && !shouldResetDisplay) return;

            const validDigits = validDigitsForBase[currentBase];
            if (!validDigits.includes(digit.toUpperCase())) return;

            if (digit === "." && currentBase !== 10) return; 
            if (digit === "." && currentInput.includes(".")) return; 

            if (shouldResetDisplay || (currentInput === "0" && digit !== ".")) {
                currentInput = digit;
                shouldResetDisplay = false;
            } else {
                currentInput += digit;
            }
            updateDisplay(currentInput);
        }

        function handleOperator(op) {
            if (errorState) resetCalculator();
            
            if (operator !== null && !shouldResetDisplay) { 
                calculate();
                if(errorState) return;
            }
            
            operator = op;
            previousInput = currentInput;
            shouldResetDisplay = true;
        }

        function handleEquals() {
            if (errorState) resetCalculator();
            
            if (operator === null) { // No pending operator
                // If previousInput is set (e.g. from a previous calculation or explicit store),
                // and no new operator, Windows calc usually does nothing or repeats last op.
                // For simplicity, we'll do nothing here if no operator.
                return;
            }

            if (previousInput === "") { // e.g. "5 =" or just "="
                if (currentInput && operator) { // If only current input and an operator (like "5 * =")
                    previousInput = currentInput; // Use currentInput as both operands
                } else {
                    return; // Not enough info
                }
            }
            // If shouldResetDisplay is true, it means an operator was just pressed,
            // and the user hasn't entered the second operand yet.
            // In this case, Windows calculator often uses the current display value as the second operand.
            // However, our `handleOperator` sets `shouldResetDisplay = true` AFTER storing `previousInput`.
            // So, if `shouldResetDisplay` is true here, it means we are in a state like "5 * =" (after pressing *).
            // The `currentInput` is still "5". We want `previousInput` ("5") and `currentInput` ("5").
            // This is handled by the logic above that sets `previousInput = currentInput` if `previousInput` was empty.

            calculate();
            // After equals, the result is in currentInput.
            // previousInput retains its value for repeated equals (e.g., 2 + 3 = (5), = (8), = (11))
            // operator is cleared by calculate().
            // To enable repeated equals with the *second* operand:
            // We need to store the second operand if we want "2 + 3 = = =" to be 2+3=5, 5+3=8, 8+3=11
            // The current `calculate` clears operator. For repeated equals, we need to re-apply the last operator
            // with `previousInput` being the result, and `currentInput` being the *last entered second operand*.
            // This gets more complex. For now, `previousInput` is the first operand, `currentInput` is the second.
            // After calculation, `currentInput` is the result. `previousInput` might be the old `currentInput`.
            // Let's simplify: after '=', `previousInput` becomes the result, `currentInput` could be the last operand.
            // For now, `calculate` makes `currentInput` the result and clears `operator`.
            // `previousInput` is the value *before* the last `currentInput` was entered for the calculation.
        }
        
        function handleUnary(unaryOp) {
            if (errorState) resetCalculator();
            let val = parseInput(currentInput);
            let result;
            const isInv = invCheckbox.checked;
            const isHyp = hypCheckbox.checked;

            switch (unaryOp) {
                case "neg": result = -val; break;
                case "recip": 
                    if (val === 0) { errorState = true; result = 0; }
                    else result = 1 / val;
                    break;
                case "pow2": result = Math.pow(val, 2); break;
                case "pow3": result = Math.pow(val, 3); break;
                case "sqrt":
                    if (val < 0 && currentBase === 10) { errorState = true; result = 0; } // sqrt of negative only error for dec
                    else if (val < 0 && currentBase !== 10) { result = Math.sqrt(-val); /* Or error, depending on desired behavior for non-dec */}
                    else result = Math.sqrt(val);
                    break;
                case "log": 
                    if (val <= 0) { errorState = true; result = 0; }
                    else result = isInv ? Math.pow(10, val) : Math.log10(val);
                    break;
                case "ln": 
                    if (val <= 0) { errorState = true; result = 0; }
                    else result = isInv ? Math.exp(val) : Math.log(val);
                    break;
                case "fact":
                    if (val < 0 || val !== Math.floor(val) || val > 170) { 
                        errorState = true; result = 0;
                    } else {
                        result = 1;
                        for (let i = 2; i <= val; i++) result *= i;
                    }
                    break;
                case "int": result = Math.trunc(val); break;
                case "sin": case "cos": case "tan":
                    let angleRad = val; // Assume val is in currentAngleMode
                    if (currentAngleMode === "deg") angleRad = val * Math.PI / 180;
                    else if (currentAngleMode === "grad") angleRad = val * Math.PI / 200;
                    // angleRad is now in radians for Math functions

                    let tempResult;
                    if (isHyp) {
                        if (unaryOp === "sin") tempResult = Math.sinh(angleRad);
                        else if (unaryOp === "cos") tempResult = Math.cosh(angleRad);
                        else if (unaryOp === "tan") tempResult = Math.tanh(angleRad);
                        if (isInv) { // Inverse hyperbolic
                            if (unaryOp === "sin") tempResult = Math.asinh(val); // Input to asinh is the value
                            else if (unaryOp === "cos") tempResult = Math.acosh(val);
                            else if (unaryOp === "tan") tempResult = Math.atanh(val);
                        }
                    } else { // Standard trig
                        if (unaryOp === "sin") tempResult = Math.sin(angleRad);
                        else if (unaryOp === "cos") tempResult = Math.cos(angleRad);
                        else if (unaryOp === "tan") tempResult = Math.tan(angleRad);
                        if (isInv) { // Inverse standard trig
                            // Input to asin/acos/atan is the ratio (val), output is angle in radians
                            if (unaryOp === "sin") tempResult = Math.asin(val); 
                            else if (unaryOp === "cos") tempResult = Math.acos(val);
                            else if (unaryOp === "tan") tempResult = Math.atan(val);
                            // Convert result (radians) back to currentAngleMode
                            if (currentAngleMode === "deg") tempResult = tempResult * 180 / Math.PI;
                            else if (currentAngleMode === "grad") tempResult = tempResult * 200 / Math.PI;
                        }
                    }
                    result = tempResult;
                    break;
                default: return;
            }
            if (isNaN(result) || !isFinite(result)) {
                errorState = true;
            }
            currentInput = formatOutput(result);
            shouldResetDisplay = true; // Unary operations usually complete an entry
            updateDisplay(currentInput);
        }

        function handleMemory(memOp) {
            if (errorState) resetCalculator();
            // Memory operations always use base 10 values internally
            let valInDec = currentBase === 10 ? parseFloat(currentInput) : parseInt(currentInput, currentBase);
            if (isNaN(valInDec)) valInDec = 0; // Default to 0 if current input is not a valid number

            switch (memOp) {
                case "mc": memoryValue = 0; break;
                case "mr": 
                    // When recalling, convert memory (base 10) to current display base
                    currentInput = formatOutput(memoryValue); // formatOutput handles currentBase
                    shouldResetDisplay = true;
                    updateDisplay(currentInput);
                    break;
                case "ms": memoryValue = valInDec; break; 
                case "mplus": memoryValue += valInDec; break;
            }
        }

        function handlePi() {
            if (errorState) resetCalculator();
            // PI is always base 10, then formatted for current display base
            currentInput = formatOutput(Math.PI); 
            shouldResetDisplay = true;
            updateDisplay(currentInput);
        }

        function changeBase(newBaseValue) {
            const newBaseNum = parseInt(newBaseValue);
            if (currentBase === newBaseNum) return;

            if (!errorState) {
                try {
                    // Convert currentInput from oldBase to decimal, then to newBase
                    // Ensure we handle potential floating point from base 10 correctly
                    let numInDec;
                    if (currentBase === 10 && currentInput.includes('.')) {
                        numInDec = parseFloat(currentInput); // Keep float if current is base 10
                    } else {
                        numInDec = parseInt(currentInput, currentBase);
                    }

                    if (!isNaN(numInDec)) {
                        if (newBaseNum === 10) {
                            currentInput = String(numInDec); // Preserve float if new base is 10
                        } else {
                            currentInput = Math.trunc(numInDec).toString(newBaseNum).toUpperCase(); // Integers for other bases
                        }
                    } else { 
                        currentInput = "0";
                    }
                } catch (e) {
                    currentInput = "0"; 
                }
            } else {
                 currentInput = "0"; 
                 errorState = false;
            }
            
            currentBase = newBaseNum;
            shouldResetDisplay = true;
            updateDisplay(currentInput);

            windowEl.querySelector('#calc-dot').disabled = (currentBase !== 10);
            ['A','B','C','D','E','F'].forEach(hexDigit => {
                const btn = windowEl.querySelector(`#calc-${hexDigit}`);
                if (btn) btn.disabled = (currentBase !== 16);
            });
        }
    }
};
