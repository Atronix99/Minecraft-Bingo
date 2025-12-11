let allItems = [];
const BOARD_SIZE = 6;
const boardElement = document.getElementById('bingo-board');
const tooltipElement = document.createElement('div');
tooltipElement.id = 'image-tooltip';
document.body.appendChild(tooltipElement);

let currentBoardCode = ''; 

function showNotification(message, duration = 3000) {
    const popup = document.getElementById('notification-popup');
    const messageDisplay = document.getElementById('notification-message');
    
    messageDisplay.textContent = message;
    
    clearTimeout(popup.timer);

    popup.classList.remove('hide');
    popup.style.display = 'flex';
    void popup.offsetWidth; 
    popup.classList.add('show');
    
    popup.timer = setTimeout(() => {
        closeCustomPopup('notification-popup');
    }, duration);
}

function showCustomPopup(code) {
    const popup = document.getElementById('custom-popup');
    const codeDisplay = document.getElementById('popup-board-code');
    
    currentBoardCode = code; 
    codeDisplay.textContent = code;
    
    popup.classList.remove('hide');
    popup.style.display = 'flex';
    void popup.offsetWidth; 
    popup.classList.add('show');
}

function closeCustomPopup(id) {
    const popup = document.getElementById(id);
    
    popup.classList.remove('show');
    popup.classList.add('hide');
    
    setTimeout(() => {
        popup.style.display = 'none';
        popup.classList.remove('hide'); 
    }, 400); 
}

function copyToClipboardAndClose() {
    if (!currentBoardCode) {
        showNotification('Brak kodu do skopiowania!', 2000);
        return;
    }
    
    if (navigator.clipboard) {
        navigator.clipboard.writeText(currentBoardCode).then(() => {
            showNotification('Kod planszy został skopiowany do schowka!');
            closeCustomPopup('custom-popup');
        }).catch(err => {
            console.error('Błąd podczas kopiowania do schowka:', err);
            const textarea = document.createElement('textarea');
            textarea.value = currentBoardCode;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            showNotification('Kod planszy (awaryjnie) skopiowany do schowka! Spróbuj ręcznie.');
            closeCustomPopup('custom-popup');
        });
    } else {
        const textarea = document.createElement('textarea');
        textarea.value = currentBoardCode;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showNotification('Kod planszy skopiowany do schowka!');
        closeCustomPopup('custom-popup');
    }
}


async function loadItems() {
    try {
        const response = await fetch('baza.json');
        if (!response.ok) {
            throw new Error(`Błąd HTTP: ${response.status}`);
        }
        const data = await response.json();
        
        allItems = data.map(item => ({
            name: item.name.replace(/_/g, ' '),
            image: item.image,
            weight: item.difficulty
        }));

    } catch (error) {
        console.error("Nie udało się wczytać przedmiotów z baza.json:", error);
        showNotification("Błąd krytyczny: Nie udało się wczytać przedmiotów z bazy!", 5000);
    }
}

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function generateBoard(fixedItems = null) {
    const difficultySelect = document.getElementById('difficulty-select');
    const selectedMode = difficultySelect ? difficultySelect.value : 'normal';

    if (allItems.length === 0) {
        showNotification('Błąd: Brak wczytanych przedmiotów.', 3000);
        return; 
    }
    
    boardElement.innerHTML = '';
    
    let finalItems;

    if (fixedItems && fixedItems.length === BOARD_SIZE * BOARD_SIZE) {
        finalItems = fixedItems.map(name => allItems.find(item => item.name === name.replace(/_/g, ' ')));
        if (finalItems.some(item => !item)) {
            showNotification('Błąd: Kod planszy zawiera nieznane przedmioty.', 4000);
            return;
        }

    } else {
        if (selectedMode === 'easy') {
            const required_2 = BOARD_SIZE * (BOARD_SIZE / 2);
            const required_1 = BOARD_SIZE * (BOARD_SIZE / 2);
            
            if (BOARD_SIZE % 2 !== 0) {
                showNotification('Błąd: Tryb łatwy jest dostępny tylko dla parzystych rozmiarów planszy (np. 6x6).', 5000);
                return;
            }

            const itemsByWeight = {
                1: allItems.filter(item => item.weight === 1),
                2: allItems.filter(item => item.weight === 2)
            };

            if (itemsByWeight[1].length < required_1 || itemsByWeight[2].length < required_2) {
                showNotification('Błąd: Za mało przedmiotów difficulty 1 lub 2 dla trybu łatwego. Użyj trybu Normalnego.', 5000);
                return;
            }

            const board = Array(BOARD_SIZE).fill(0).map(() => Array(BOARD_SIZE).fill(null));
            const rowCount = { 1: Array(BOARD_SIZE).fill(0), 2: Array(BOARD_SIZE).fill(0) };
            const colCount = { 1: Array(BOARD_SIZE).fill(0), 2: Array(BOARD_SIZE).fill(0) };

            const usedIndices = { 1: [], 2: [] };

            const getAvailableItem = (weight) => {
                const itemIndex = itemsByWeight[weight].findIndex((_, index) => !usedIndices[weight].includes(index));
                if (itemIndex > -1) {
                    const item = itemsByWeight[weight][itemIndex];
                    usedIndices[weight].push(itemIndex);
                    return item;
                }
                return null;
            };

            shuffle(itemsByWeight[1]);
            shuffle(itemsByWeight[2]);

            const MAX_COUNT = BOARD_SIZE / 2;

            for (let r = 0; r < BOARD_SIZE; r++) {
                for (let c = 0; c < BOARD_SIZE; c++) {
                    let selectedWeight = null;
                    
                    const count1r = rowCount[1][r];
                    const count2r = rowCount[2][r];
                    const count1c = colCount[1][c];
                    const count2c = colCount[2][c];

                    const mustBe2Row = count2r < MAX_COUNT && count1r === MAX_COUNT; 
                    const mustBe2Col = count2c < MAX_COUNT && count1c === MAX_COUNT; 
                    const mustBe1Row = count1r < MAX_COUNT && count2r === MAX_COUNT; 
                    const mustBe1Col = count1c < MAX_COUNT && count2c === MAX_COUNT; 

                    if (mustBe2Row || mustBe2Col) {
                        selectedWeight = 2;
                    } else if (mustBe1Row || mustBe1Col) {
                        selectedWeight = 1;
                    } else {
                        const canBe2 = count2r < MAX_COUNT && count2c < MAX_COUNT;
                        const canBe1 = count1r < MAX_COUNT && count1c < MAX_COUNT;

                        if (canBe2 && canBe1) {
                             const remaining1 = required_1 - usedIndices[1].length;
                             const remaining2 = required_2 - usedIndices[2].length;
                             
                             if (remaining1 > 0 && remaining2 > 0) {
                                selectedWeight = (remaining1 / (remaining1 + remaining2)) > Math.random() ? 1 : 2;
                             } else if (remaining1 > 0) {
                                selectedWeight = 1;
                             } else if (remaining2 > 0) {
                                selectedWeight = 2;
                             } else {
                                showNotification('Błąd: Nieoczekiwane wyczerpanie przedmiotów!', 5000);
                                return;
                             }
                             
                        } else if (canBe2) {
                            selectedWeight = 2;
                        } else if (canBe1) {
                            selectedWeight = 1;
                        } else {
                            showNotification('Błąd: Niespełnione warunki 3x difficulty 1 i 3x difficulty 2. Zresetuj planszę.', 5000);
                            return;
                        }
                    }
                    
                    const item = getAvailableItem(selectedWeight);
                    
                    if (!item) {
                         const otherWeight = selectedWeight === 1 ? 2 : 1;
                         const otherItem = getAvailableItem(otherWeight);

                         if (otherItem && rowCount[otherWeight][r] < MAX_COUNT && colCount[otherWeight][c] < MAX_COUNT) {
                             selectedWeight = otherWeight;
                             board[r][c] = otherItem;
                         } else {
                             showNotification('Błąd: Wyczerpano dostępne przedmioty lub kolizja z rozkładem 3x3! Spróbuj ponownie.', 5000);
                             return;
                         }
                    } else {
                        board[r][c] = item;
                    }

                    rowCount[selectedWeight][r]++;
                    colCount[selectedWeight][c]++;
                }
            }
            finalItems = board.flat();


        } else {
            const required_3 = BOARD_SIZE; 
            const required_2 = 15; 
            const required_1 = BOARD_SIZE * BOARD_SIZE - required_3 - required_2;

            const itemsByWeight = {
                1: allItems.filter(item => item.weight === 1),
                2: allItems.filter(item => item.weight === 2),
                3: allItems.filter(item => item.weight === 3)
            };

            const totalItems = BOARD_SIZE * BOARD_SIZE;
            const usedIndices = { 1: [], 2: [], 3: [] };

            const board = Array(BOARD_SIZE).fill(0).map(() => Array(BOARD_SIZE).fill(null));
            
            const getAvailableItems = (weight, count) => {
                const availableItems = itemsByWeight[weight].filter((_, index) => !usedIndices[weight].includes(index));
                shuffle(availableItems);
                return availableItems.slice(0, count);
            };
            
            if (itemsByWeight[3].length < required_3) {
                boardElement.innerHTML = `Błąd: Za mało przedmiotów difficulty 3. Potrzeba ${required_3}.`;
                showNotification(`Błąd: Za mało przedmiotów difficulty 3. Potrzeba ${required_3}.`, 5000);
                return;
            }

            const pool3 = getAvailableItems(3, required_3);
            
            const col_indices = Array.from({ length: BOARD_SIZE }, (_, i) => i);
            shuffle(col_indices); 
            
            for (let r = 0; r < BOARD_SIZE; r++) {
                const c = col_indices[r]; 
                const item = pool3[r];
                
                board[r][c] = item;
                usedIndices[3].push(itemsByWeight[3].findIndex(i => i.name === item.name)); 
            }

            const rowCount = { 1: Array(BOARD_SIZE).fill(0), 2: Array(BOARD_SIZE).fill(0) };
            const colCount = { 1: Array(BOARD_SIZE).fill(0), 2: Array(BOARD_SIZE).fill(0) };
            
            const MIN_WEIGHT_1 = 2; 
            const MAX_WEIGHT_1 = 3; 
            const MIN_WEIGHT_2 = 2; 
            const MAX_WEIGHT_2 = 3; 

            for (let r = 0; r < BOARD_SIZE; r++) {
                for (let c = 0; c < BOARD_SIZE; c++) {
                    if (board[r][c] !== null) continue;

                    const current_2 = board.flat().filter(i => i && i.weight === 2).length;
                    const current_1 = board.flat().filter(i => i && i.weight === 1).length;
                    const remainingCells = totalItems - board.flat().filter(i => i !== null).length;
                    
                    const needed_2 = required_2 - current_2;
                    const needed_1 = required_1 - current_1;

                    let selectedWeight = null;
                    
                    const mustBe2Global = needed_2 > 0 && needed_2 === remainingCells; 
                    const mustBe2Row = rowCount[2][r] < MIN_WEIGHT_2 && rowCount[1][r] === MAX_WEIGHT_1; 
                    const mustBe2Col = colCount[2][c] < MIN_WEIGHT_2 && colCount[1][c] === MAX_WEIGHT_1; 
                    
                    const mustBe1Global = needed_1 > 0 && needed_1 === remainingCells; 
                    const mustBe1Row = rowCount[1][r] < MIN_WEIGHT_1 && rowCount[2][r] === MAX_WEIGHT_2; 
                    const mustBe1Col = colCount[1][c] < MIN_WEIGHT_1 && colCount[2][c] === MAX_WEIGHT_2; 

                    if (mustBe2Global || mustBe2Row || mustBe2Col) {
                        selectedWeight = 2;
                    } else if (mustBe1Global || mustBe1Row || mustBe1Col) {
                        selectedWeight = 1;
                    } else {
                        const canBe2 = rowCount[2][r] < MAX_WEIGHT_2 && colCount[2][c] < MAX_WEIGHT_2 && needed_2 > 0;
                        const canBe1 = rowCount[1][r] < MAX_WEIGHT_1 && colCount[1][c] < MAX_WEIGHT_1 && needed_1 > 0;

                        if (canBe2 && canBe1) {
                             selectedWeight = Math.random() < 0.7 ? 2 : 1; 
                        } else if (canBe2) {
                            selectedWeight = 2;
                        } else if (canBe1) {
                            selectedWeight = 1;
                        } else {
                            boardElement.innerHTML = 'Błąd: Niespełnione warunki alokacji 1/2. Zresetuj planszę.';
                            showNotification('Błąd: Niespełnione warunki alokacji 1/2. Zresetuj planszę.', 5000);
                            return;
                        }
                    }
                    
                    if (getAvailableItems(selectedWeight, 1).length === 0) {
                         const otherWeight = selectedWeight === 1 ? 2 : 1;
                         if (getAvailableItems(otherWeight, 1).length > 0) {
                             selectedWeight = otherWeight;
                         } else {
                             boardElement.innerHTML = 'Błąd: Wyczerpano dostępne przedmioty! Zresetuj planszę.';
                             showNotification('Błąd: Wyczerpano dostępne przedmioty! Zresetuj planszę.', 5000);
                             return;
                         }
                    }

                    const itemPool = getAvailableItems(selectedWeight, 1);
                    const item = itemPool[0];
                    
                    board[r][c] = item;
                    rowCount[selectedWeight][r]++;
                    colCount[selectedWeight][c]++;
                    
                    usedIndices[selectedWeight].push(itemsByWeight[selectedWeight].findIndex(i => i.name === item.name)); 
                }
            }
            finalItems = board.flat();
        }
    }
    
    let delay = 0;
    const delayIncrement = 25;

    for (let i = 0; i < finalItems.length; i++) { 
        const item = finalItems[i];
        const cell = document.createElement('div');
        cell.classList.add('item-cell');
        cell.setAttribute('data-alt', item.name);
        
        const columnIndex = i % BOARD_SIZE; 
        const isLastColumn = columnIndex === BOARD_SIZE - 1; 
        
        const content = item.image ? 
            `<img src="${item.image}" alt="${item.name}" class="item-image">` :
            `<span class="item-name">${item.name}</span>`;

        cell.innerHTML = content;
        cell.addEventListener('click', () => {
            cell.classList.toggle('completed');
            checkWinCondition();
        });

        function checkWinCondition() {
            const cells = Array.from(boardElement.querySelectorAll('.item-cell'));
            if (cells.length === 0) return;

            const board = Array(BOARD_SIZE).fill(0).map((_, i) => 
                cells.slice(i * BOARD_SIZE, (i + 1) * BOARD_SIZE)
            );

            cells.forEach(cell => cell.classList.remove('win-line'));

            const completedLines = [];
            
            for (let r = 0; r < BOARD_SIZE; r++) {
                if (board[r].every(cell => cell.classList.contains('completed'))) {
                    completedLines.push(board[r]);
                }
            }

            for (let c = 0; c < BOARD_SIZE; c++) {
                const column = [];
                for (let r = 0; r < BOARD_SIZE; r++) {
                    column.push(board[r][c]);
                }
                if (column.every(cell => cell.classList.contains('completed'))) {
                    completedLines.push(column);
                }
            }

            completedLines.flat().forEach(cell => cell.classList.add('win-line'));
        }
        
        cell.addEventListener('mousemove', (e) => {
            tooltipElement.textContent = item.name;
            
            if (isLastColumn && window.innerWidth < 600) { 
                tooltipElement.style.right = (window.innerWidth - e.pageX + 15) + 'px'; 
                tooltipElement.style.left = 'auto';
            } else {
                tooltipElement.style.left = (e.pageX + 10) + 'px';
                tooltipElement.style.right = 'auto';
            }

            tooltipElement.style.top = (e.pageY + 10) + 'px';
            tooltipElement.style.display = 'block';
        });
        cell.addEventListener('mouseleave', () => {
            tooltipElement.style.display = 'none';
        });

        boardElement.appendChild(cell);

        setTimeout(() => {
            cell.classList.add('animate-in');
        }, delay);
        delay += delayIncrement;
    }
}

function exportBoard() {
    const cells = boardElement.querySelectorAll('.item-cell');
    if (cells.length !== BOARD_SIZE * BOARD_SIZE) {
        showNotification('Plansza jest pusta lub niekompletna. Wygeneruj nową.', 3000);
        return;
    }
    
    const boardNames = Array.from(cells).map(cell => cell.getAttribute('data-alt'));
    
    const jsonString = JSON.stringify(boardNames);
    const encoded = btoa(jsonString);
    
    document.getElementById('board-code-input').value = ''; 
    showCustomPopup(encoded);
}

function importBoard() {
    const encoded = document.getElementById('board-code-input').value.trim();
    if (!encoded) {
        showNotification('Wklej kod planszy do pola tekstowego, aby zaimportować.', 3000);
        return;
    }
    
    try {
        const jsonString = atob(encoded);
        const importedNames = JSON.parse(jsonString);
        
        if (Array.isArray(importedNames) && importedNames.length === BOARD_SIZE * BOARD_SIZE) {
            generateBoard(importedNames);
            document.getElementById('board-code-input').value = '';
            showNotification('Plansza została pomyślnie zaimportowana!');
        } else {
            showNotification('Błąd: Nieprawidłowy format kodu planszy.', 4000);
        }

    } catch (e) {
        showNotification('Błąd: Kod planszy jest uszkodzony lub nieprawidłowy.', 4000);
        console.error('Import Error:', e);
    }
}

function forceBoardCompleteState() {
    const cells = boardElement.querySelectorAll('.item-cell');
    cells.forEach(cell => {
        cell.style.opacity = '1';
        cell.style.transform = 'none';
        cell.style.transition = 'none';
        cell.classList.remove('animate-in');
    });
}

function restoreBoardAnimationState() {
    const cells = boardElement.querySelectorAll('.item-cell');
    cells.forEach(cell => {
        cell.style.opacity = '';
        cell.style.transform = '';
        cell.style.transition = '';
        cell.classList.add('animate-in'); 
    });
}

function downloadBoardAsImage() {
    const board = document.getElementById('bingo-board');

    if (typeof html2canvas === 'undefined') {
        showNotification("Błąd: Biblioteka html2canvas nie jest załadowana.", 5000);
        return;
    }
    
    forceBoardCompleteState(); 

    html2canvas(board, {
        allowTaint: true,
        useCORS: true,
        backgroundColor: '#36393F' 
    }).then(canvas => {
        const image = canvas.toDataURL('image/png');
        
        const a = document.createElement('a');
        a.href = image;
        a.download = 'minecraft_bingo_board.png';
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        restoreBoardAnimationState(); 
        showNotification('Plansza została pobrana jako obraz PNG.');

    }).catch(error => {
        console.error("Błąd podczas generowania obrazu:", error);
        restoreBoardAnimationState();
        showNotification("Wystąpił błąd podczas pobierania planszy jako obraz.", 4000);
    });
}

window.onload = async () => {
    await loadItems();
    generateBoard();

    const downloadButton = document.getElementById('download-board-btn');
    if (downloadButton) {
        downloadButton.addEventListener('click', downloadBoardAsImage);
    }
};