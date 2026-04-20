const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
let arregloGlobal = [];
let estaOrdenando = false;
let maxValGlobal = 100;

const VELOCIDAD = 150;

const COLOR_BASE = '#abcbd3';
const COLOR_COMPARA = '#e99897';
const COLOR_LISTO = '#d9825b';

let tiempoInicio;
let intervaloCronometro;
let modalCallback = null;

function abrirHelp() {
    document.getElementById("help-modal").classList.add("active");
}

function cerrarHelp() {
    document.getElementById("help-modal").classList.remove("active");
}

function abrirModal(titulo, callback = null, tipo = "text") {
    document.getElementById("modal-title").textContent = titulo;
    const input = document.getElementById("modal-input");
    input.value = "";
    input.type = tipo;
    document.getElementById("modal-error").textContent = "";
    input.style.display = callback ? "block" : "none";
    document.getElementById("modal").classList.add("active");
    modalCallback = callback;
    if (callback) input.focus();
}

function cerrarModal() {
    document.getElementById("modal").classList.remove("active");
}

function confirmarModal() {
    const input = document.getElementById("modal-input");
    if (input.style.display !== "none") {
        if (input.value.trim() === "") {
            document.getElementById("modal-error").textContent = "El campo no puede estar vacío.";
            return;
        }
        if (modalCallback && modalCallback(input.value.trim()) === false) return;
    }
    cerrarModal();
}

function generarArregloRandom() {
    if (estaOrdenando) return;
    const sizeInput = parseInt(document.getElementById('input-size').value);
    const size = (sizeInput >= 2 && sizeInput <= 100) ? sizeInput : 15;

    arregloGlobal = [];
    for (let i = 0; i < size; i++) {
        arregloGlobal.push(Math.floor(Math.random() * 99) + 1);
    }
    limpiarTiempo();
    renderizarArreglo(arregloGlobal);
}

function cargarManual() {
    if (estaOrdenando) return;
    const inputManual = document.getElementById('input-manual').value;
    if (!inputManual.trim()) return abrirModal("Por favor ingresa números separados por coma.", null, "hidden");

    const nuevoArreglo = inputManual.split(',').map(num => parseInt(num.trim())).filter(num => !isNaN(num));

    if (nuevoArreglo.length === 0) return abrirModal("Formato inválido. Ejemplo: 5, 12, 8, 45", null, "hidden");

    arregloGlobal = nuevoArreglo;
    limpiarTiempo();
    renderizarArreglo(arregloGlobal);
}

function limpiarArreglo() {
    if (estaOrdenando) return;
    arregloGlobal = [];
    limpiarTiempo();
    document.getElementById('input-manual').value = '';
    const container = document.getElementById('sort-container');
    container.innerHTML = '<p style="color: #999; width: 100%; text-align: center; align-self: center;">Datos limpiados. Ingresa nuevos valores.</p>';
}

function limpiarTiempo() {
    document.getElementById('tiempo-ejecucion').innerText = "";
    clearInterval(intervaloCronometro);
}

function exportarJSON() {
    if (arregloGlobal.length === 0) return abrirModal("No hay datos para exportar.", null, "hidden");

    abrirModal("Nombre del archivo JSON", (nombreArchivo) => {
        const datos = {
            tipo: "ordenamiento_arreglo",
            tamaño: arregloGlobal.length,
            arreglo: arregloGlobal
        };
        const blob = new Blob([JSON.stringify(datos, null, 2)], { type: "application/json" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = (nombreArchivo || "arreglo_sort") + ".json";
        a.click();
    });
}

function importarJSON(event) {
    if (estaOrdenando) return;
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const json = JSON.parse(e.target.result);
            if (json.arreglo && Array.isArray(json.arreglo)) {
                arregloGlobal = json.arreglo.map(Number);
                limpiarTiempo();
                renderizarArreglo(arregloGlobal);
            } else {
                abrirModal("El archivo JSON no tiene el formato correcto.", null, "hidden");
            }
        } catch (error) {
            abrirModal("Error al leer el archivo JSON.", null, "hidden");
        }
        event.target.value = '';
    };
    reader.readAsText(file);
}

function getSquareSize(valor) {
    const minSize = 40;
    const maxSize = 120;
    const proporcion = valor / (maxValGlobal || 1);
    return minSize + (proporcion * (maxSize - minSize));
}

function renderizarArreglo(arr) {
    const container = document.getElementById('sort-container');
    container.innerHTML = '';

    maxValGlobal = Math.max(...arr, 1);

    container.style.justifyContent = 'flex-start';

    arr.forEach((valor, index) => {
        const cuadrado = document.createElement('div');
        cuadrado.id = `cuadrado-${index}`;
        cuadrado.innerText = valor;

        const sizePx = getSquareSize(valor);

        cuadrado.style.width = `${sizePx}px`;
        cuadrado.style.height = `${sizePx}px`;
        cuadrado.style.flexShrink = '0';
        cuadrado.style.background = COLOR_BASE;
        cuadrado.style.color = '#fff';
        cuadrado.style.fontSize = sizePx > 60 ? '22px' : '16px';
        cuadrado.style.fontWeight = 'bold';
        cuadrado.style.display = 'flex';
        cuadrado.style.alignItems = 'center';
        cuadrado.style.justifyContent = 'center';
        cuadrado.style.borderRadius = '12px';
        cuadrado.style.boxShadow = '0 8px 20px rgba(0,0,0,0.15)';
        cuadrado.style.transition = 'all 0.2s ease';
        cuadrado.style.textShadow = '1px 1px 3px rgba(0,0,0,0.3)';

        container.appendChild(cuadrado);
    });
}

function colorSquare(index, color) {
    const cuadrado = document.getElementById(`cuadrado-${index}`);
    if (cuadrado) {
        cuadrado.style.background = color;
        if (color === COLOR_COMPARA) cuadrado.style.transform = 'translateY(-15px) scale(1.05)';
        else cuadrado.style.transform = 'translateY(0) scale(1)';
    }
}

async function overwrite(index, valor, arr) {
    arr[index] = valor;
    const cuadrado = document.getElementById(`cuadrado-${index}`);
    if (cuadrado) {
        cuadrado.innerText = valor;
        const newSizePx = getSquareSize(valor);
        cuadrado.style.width = `${newSizePx}px`;
        cuadrado.style.height = `${newSizePx}px`;
        cuadrado.style.fontSize = newSizePx > 60 ? '22px' : '16px';
    }
    await sleep(VELOCIDAD);
}

async function swap(i, j, arr) {
    let temp = arr[i];
    await overwrite(i, arr[j], arr);
    await overwrite(j, temp, arr);
}


function actualizarCronometro() {
    let tiempoActual = Date.now() - tiempoInicio;
    let segundos = (tiempoActual / 1000).toFixed(2);
    document.getElementById('tiempo-ejecucion').innerText = `Procesando... ${segundos} s`;
}

async function iniciarOrdenamiento() {
    if (estaOrdenando || arregloGlobal.length === 0) return;
    estaOrdenando = true;

    const algo = document.getElementById('select-algo').value;
    const ascendente = document.getElementById('select-orden').value === 'asc';

    tiempoInicio = Date.now();
    intervaloCronometro = setInterval(actualizarCronometro, 10);

    for (let i = 0; i < arregloGlobal.length; i++) colorSquare(i, COLOR_BASE);

    if (algo === 'selection') await selectionSort(ascendente);
    else if (algo === 'insertion') await insertionSort(ascendente);
    else if (algo === 'shell') await shellSort(ascendente);
    else if (algo === 'merge') await mergeSortWrapper(ascendente);

    for (let i = 0; i < arregloGlobal.length; i++) colorSquare(i, COLOR_LISTO);

    clearInterval(intervaloCronometro);
    let tiempoFinal = Date.now() - tiempoInicio;
    document.getElementById('tiempo-ejecucion').innerText = ` Terminado en ${(tiempoFinal / 1000).toFixed(2)} s`;

    estaOrdenando = false;
}

async function selectionSort(ascendente) {
    let n = arregloGlobal.length;
    for (let i = 0; i < n - 1; i++) {
        let minMaxIdx = i;
        colorSquare(i, COLOR_COMPARA);
        for (let j = i + 1; j < n; j++) {
            colorSquare(j, '#f6b38a');
            await sleep(VELOCIDAD / 2);
            let condicion = ascendente ? (arregloGlobal[j] < arregloGlobal[minMaxIdx]) : (arregloGlobal[j] > arregloGlobal[minMaxIdx]);
            if (condicion) {
                if (minMaxIdx !== i) colorSquare(minMaxIdx, COLOR_BASE);
                minMaxIdx = j;
                colorSquare(minMaxIdx, COLOR_COMPARA);
            } else {
                colorSquare(j, COLOR_BASE);
            }
        }
        if (minMaxIdx !== i) await swap(i, minMaxIdx, arregloGlobal);
        colorSquare(minMaxIdx, COLOR_BASE);
        colorSquare(i, COLOR_LISTO);
    }
}

async function insertionSort(ascendente) {
    let n = arregloGlobal.length;
    colorSquare(0, COLOR_LISTO);
    for (let i = 1; i < n; i++) {
        let key = arregloGlobal[i];
        let j = i - 1;
        colorSquare(i, COLOR_COMPARA);
        await sleep(VELOCIDAD);

        while (j >= 0 && (ascendente ? arregloGlobal[j] > key : arregloGlobal[j] < key)) {
            colorSquare(j, COLOR_COMPARA);
            await overwrite(j + 1, arregloGlobal[j], arregloGlobal);
            colorSquare(j + 1, COLOR_LISTO);
            j--;
        }
        await overwrite(j + 1, key, arregloGlobal);
        for (let k = 0; k <= i; k++) colorSquare(k, COLOR_LISTO);
    }
}

async function shellSort(ascendente) {
    let n = arregloGlobal.length;
    for (let gap = Math.floor(n / 2); gap > 0; gap = Math.floor(gap / 2)) {
        for (let i = gap; i < n; i++) {
            let temp = arregloGlobal[i];
            let j;
            colorSquare(i, COLOR_COMPARA);
            await sleep(VELOCIDAD);

            for (j = i; j >= gap && (ascendente ? arregloGlobal[j - gap] > temp : arregloGlobal[j - gap] < temp); j -= gap) {
                colorSquare(j - gap, COLOR_COMPARA);
                await overwrite(j, arregloGlobal[j - gap], arregloGlobal);
                colorSquare(j, COLOR_BASE);
            }
            await overwrite(j, temp, arregloGlobal);
            colorSquare(j, COLOR_BASE);
        }
    }
}

async function mergeSortWrapper(ascendente) {
    await runMergeSort(0, arregloGlobal.length - 1, ascendente);
}

async function runMergeSort(left, right, ascendente) {
    if (left >= right) return;
    let mid = left + Math.floor((right - left) / 2);
    await runMergeSort(left, mid, ascendente);
    await runMergeSort(mid + 1, right, ascendente);
    await merge(left, mid, right, ascendente);
}

async function merge(left, mid, right, ascendente) {
    let n1 = mid - left + 1;
    let n2 = right - mid;
    let L = new Array(n1); let R = new Array(n2);
    for (let i = 0; i < n1; i++) L[i] = arregloGlobal[left + i];
    for (let j = 0; j < n2; j++) R[j] = arregloGlobal[mid + 1 + j];
    let i = 0, j = 0, k = left;

    while (i < n1 && j < n2) {
        colorSquare(left + i, COLOR_COMPARA); colorSquare(mid + 1 + j, COLOR_COMPARA);
        await sleep(VELOCIDAD);
        let condicion = ascendente ? L[i] <= R[j] : L[i] >= R[j];
        if (condicion) { await overwrite(k, L[i], arregloGlobal); i++; }
        else { await overwrite(k, R[j], arregloGlobal); j++; }
        colorSquare(k, COLOR_BASE); k++;
    }
    while (i < n1) { await overwrite(k, L[i], arregloGlobal); colorSquare(k, COLOR_BASE); i++; k++; }
    while (j < n2) { await overwrite(k, R[j], arregloGlobal); colorSquare(k, COLOR_BASE); j++; k++; }
}