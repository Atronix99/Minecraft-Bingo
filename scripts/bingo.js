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
        
        const rows = Array.from({ length: BOARD_SIZE }, (_, i) => i);
        const cols = Array.from({ length: BOARD_SIZE }, (_, i) => i);
        shuffle(rows); 
        shuffle(cols); 
        
        for (let i = 0; i < BOARD_SIZE; i++) {
            const r = rows[i]; 
            const c = cols[i];
            const item = pool3[i];
            
            board[r][c] = item;
            usedIndices[3].push(itemsByWeight[3].findIndex(i => i.name === item.name)); 
        }

        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                if (board[r][c] !== null) continue;

                const current_2 = board.flat().filter(i => i && i.weight === 2).length;
                const current_1 = board.flat().filter(i => i && i.weight === 1).length;
                const remainingCells = totalItems - board.flat().filter(i => i !== null).length;
                
                const needed_2 = required_2 - current_2;
                const needed_1 = required_1 - current_1;
                
                const min_2_needed = Math.max(0, needed_2 - (remainingCells - 1));
                const max_2_allowed = Math.min(itemsByWeight[2].length - usedIndices[2].length, needed_2);
                
                const min_1_needed = Math.max(0, needed_1 - (remainingCells - 1));
                const max_1_allowed = Math.min(itemsByWeight[1].length - usedIndices[1].length, needed_1);

                let selectedWeight = null;

                if (min_2_needed > 0 || (max_2_allowed > 0 && Math.random() < 0.7 && max_1_allowed === 0)) {
                    selectedWeight = 2;
                } else if (min_1_needed > 0 || max_1_allowed > 0) {
                    selectedWeight = 1; 
                } else if (max_2_allowed > 0) {
                    selectedWeight = 2;
                } else {
                     boardElement.innerHTML = 'Błąd: Wyczerpano dostępne przedmioty difficulty 1 lub 2.';
                     showNotification('Błąd: Wyczerpano dostępne przedmioty difficulty 1 lub 2.', 4000);
                     return;
                }
                
                const itemPool = getAvailableItems(selectedWeight, 1);
                if (itemPool.length === 0) {
                    continue; 
                }
                const item = itemPool[0];
                board[r][c] = item;
                usedIndices[selectedWeight].push(itemsByWeight[selectedWeight].findIndex(i => i.name === item.name)); 
            }
        }
        finalItems = board.flat();
    }
    
    let delay = 0;
    const delayIncrement = 25;

    for (const item of finalItems) {
        const cell = document.createElement('div');
        cell.classList.add('item-cell');
        cell.setAttribute('data-alt', item.name);
        
        const content = item.image ? 
            `<img src="${item.image}" alt="${item.name}" class="item-image">` :
            `<span class="item-name">${item.name}</span>`;

        cell.innerHTML = content;
        cell.addEventListener('click', () => cell.classList.toggle('completed'));
        
        cell.addEventListener('mousemove', (e) => {
            tooltipElement.textContent = item.name;
            tooltipElement.style.left = (e.pageX + 10) + 'px';
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