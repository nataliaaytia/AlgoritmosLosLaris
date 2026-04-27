const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

let colorActivo = "#d9825b"; 
const AZUL_AYUDA = "#abcbd3";
const NARANJA_GRAFOS = "#d9825b";
const OSCURO_AYUDA = "#8faab3";

class Nodo {
    constructor(valor) {
        this.valor = valor;
        this.izq = null;
        this.der = null;
        this.x = 0;
        this.y = 0;
        this.scale = 0; 
    }
}

class ArbolBinario {
    constructor() {
        this.raiz = null;
    }

    insertar(valor) {
        const nuevoNodo = new Nodo(valor);
        if (this.raiz === null) {
            this.raiz = nuevoNodo;
            return true;
        } else {
            return this.insertarNodo(this.raiz, nuevoNodo);
        }
    }

    insertarNodo(nodo, nuevoNodo) {
        if (nuevoNodo.valor < nodo.valor) {
            if (nodo.izq === null) {
                nodo.izq = nuevoNodo;
                return true;
            } else return this.insertarNodo(nodo.izq, nuevoNodo);
        } else if (nuevoNodo.valor > nodo.valor) {
            if (nodo.der === null) {
                nodo.der = nuevoNodo;
                return true;
            } else return this.insertarNodo(nodo.der, nuevoNodo);
        } else return false;
    }

    obtenerProfundidad(nodo) {
        if (nodo === null) return 0;
        return Math.max(this.obtenerProfundidad(nodo.izq), this.obtenerProfundidad(nodo.der)) + 1;
    }

    generarInorder(nodo, lista) {
        if (nodo !== null) {
            this.generarInorder(nodo.izq, lista);
            lista.push(nodo);
            this.generarInorder(nodo.der, lista);
        }
    }

    preorden(nodo, lista) {
        if (nodo !== null) {
            lista.push(nodo);
            this.preorden(nodo.izq, lista);
            this.preorden(nodo.der, lista);
        }
    }

    postorden(nodo, lista) {
        if (nodo !== null) {
            this.postorden(nodo.izq, lista);
            this.postorden(nodo.der, lista);
            lista.push(nodo);
        }
    }
}

let miArbol = new ArbolBinario();
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const cajaRecorridos = document.getElementById('caja-recorridos');
const wrapper = document.querySelector('.canvas-wrapper');

let animando = false;
let nodoResaltado = null;
let nodoArrastrado = null;
let tiempoAnimacion = 0;

const colorLinea = "#e8a16c";


canvas.addEventListener("mousedown", (e) => {
    if (animando) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    let listaNodos = [];
    miArbol.generarInorder(miArbol.raiz, listaNodos);
    
    const nodoEncontrado = listaNodos.find(n => Math.sqrt((n.x - x)**2 + (n.y - y)**2) < 30);
    
    if (nodoEncontrado) {
        nodoArrastrado = nodoEncontrado;
        nodoArrastrado.scale = 0.7; 
        canvas.style.cursor = "grabbing";
    }
});

canvas.addEventListener("mousemove", (e) => {
    if (nodoArrastrado) {
        const rect = canvas.getBoundingClientRect();
        nodoArrastrado.x = e.clientX - rect.left;
        nodoArrastrado.y = e.clientY - rect.top;
        dibujarArbol(false); 
    }
});

window.addEventListener("mouseup", () => {
    nodoArrastrado = null;
    canvas.style.cursor = "default";
});


function bucleAnimacion() {
    let todosNodos = [];
    miArbol.generarInorder(miArbol.raiz, todosNodos);

    let hayCambios = false;
    todosNodos.forEach(n => {
        if (n.scale < 1) {
            n.scale += 0.08;
            if (n.scale > 1) n.scale = 1;
            hayCambios = true;
        }
    });
    tiempoAnimacion += 0.1; 
    

    if (hayCambios || nodoResaltado !== null || nodoArrastrado !== null) {
        dibujarArbol(false);
    }

    requestAnimationFrame(bucleAnimacion);
}
requestAnimationFrame(bucleAnimacion);


function dibujarArbol(recalibrar = true) {
    if (!miArbol.raiz) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
    }

    if (recalibrar) {
        let listaInorder = [];
        miArbol.generarInorder(miArbol.raiz, listaInorder);
        const profundidad = miArbol.obtenerProfundidad(miArbol.raiz);
        let escala = Math.max(0.6, 1 - (profundidad * 0.05));
        let distH = 60 * escala;
        let distV = 75 * escala;

        canvas.width = Math.max(wrapper.clientWidth, (listaInorder.length + 1) * distH + 100);
        canvas.height = Math.max(450, (profundidad + 1) * distV + 100);

        const offsetInicial = (canvas.width - (listaInorder.length * distH)) / 2;
        listaInorder.forEach((nodo, i) => {
            nodo.x = offsetInicial + (i * distH);
        });
        asignarYAutomatico(miArbol.raiz, 1, distV);
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    dibujarLineas(miArbol.raiz);
    dibujarNodos(miArbol.raiz);
}

function asignarYAutomatico(nodo, nivel, distV) {
    if (!nodo) return;
    nodo.y = nivel * distV + 30;
    asignarYAutomatico(nodo.izq, nivel + 1, distV);
    asignarYAutomatico(nodo.der, nivel + 1, distV);
}

function dibujarNodos(nodo) {
    if (!nodo) return;

    
    let radioBase = 22 * nodo.scale;
    let radioEfectivo = radioBase;

    
    if (nodoResaltado === nodo.valor || nodo === nodoArrastrado) {
        radioEfectivo += Math.sin(tiempoAnimacion) * 3;
    }

    ctx.save();
    

    if (nodoResaltado === nodo.valor || nodo === nodoArrastrado) {
        ctx.shadowBlur = 15;
        ctx.shadowColor = "#c75f2f";
    }

    ctx.beginPath();
    ctx.arc(nodo.x, nodo.y, Math.max(radioEfectivo, 5), 0, Math.PI * 2);


    if (nodoResaltado === nodo.valor || nodo === nodoArrastrado) {
        const grad = ctx.createLinearGradient(nodo.x - 20, nodo.y - 20, nodo.x + 20, nodo.y + 20);
        grad.addColorStop(0, "#f6b38a");
        grad.addColorStop(1, "#e27d4f");
        ctx.fillStyle = grad;
        ctx.strokeStyle = "#d9825b";
        ctx.lineWidth = 4;
    } else {
        ctx.fillStyle = "white";
        ctx.strokeStyle = "#d9825b";
        ctx.lineWidth = 3;
    }

    ctx.fill();
    ctx.stroke();
    ctx.restore();


    if (nodo.scale > 0.5) {
        ctx.fillStyle = (nodoResaltado === nodo.valor || nodo === nodoArrastrado) ? "white" : "#d9825b";
        ctx.font = "bold 14px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(nodo.valor, nodo.x, nodo.y);
    }

    dibujarNodos(nodo.izq);
    dibujarNodos(nodo.der);
}

function dibujarLineas(nodo) {
    if (!nodo) return;
    ctx.strokeStyle = colorLinea;
    ctx.lineWidth = 2;
    if (nodo.izq) {
        ctx.beginPath();
        ctx.moveTo(nodo.x, nodo.y);
        ctx.lineTo(nodo.izq.x, nodo.izq.y);
        ctx.stroke();
        dibujarLineas(nodo.izq);
    }
    if (nodo.der) {
        ctx.beginPath();
        ctx.moveTo(nodo.x, nodo.y);
        ctx.lineTo(nodo.der.x, nodo.der.y);
        ctx.stroke();
        dibujarLineas(nodo.der);
    }
}

function bucleAnimacion() {
    let todosNodos = [];
    miArbol.generarInorder(miArbol.raiz, todosNodos);

    todosNodos.forEach(n => {
        if (n.scale < 1) {
            n.scale += 0.08;
            if (n.scale > 1) n.scale = 1;
        }
    });

    tiempoAnimacion += 0.08; 
    
    dibujarArbol(false);
    requestAnimationFrame(bucleAnimacion);
}


async function animarRecorrido(tipo) {
    if (animando || !miArbol.raiz) return;
    animando = true;
    let lista = [];
    if (tipo === 'pre') miArbol.preorden(miArbol.raiz, lista);
    if (tipo === 'in') miArbol.generarInorder(miArbol.raiz, lista);
    if (tipo === 'post') miArbol.postorden(miArbol.raiz, lista);
    
    const span = document.getElementById('res-' + tipo);
    span.textContent = "";
    for (let i = 0; i < lista.length; i++) {
        nodoResaltado = lista[i].valor;
        dibujarArbol(false); 
        if (i > 0) span.textContent += " → ";
        span.textContent += nodoResaltado;
        await sleep(1200); 
    }
    nodoResaltado = null;
    dibujarArbol(false); 
    animando = false;
}


async function insertarManual() {
    if (animando) return;
    const input = document.getElementById('input-nodo');
    const valor = parseInt(input.value);

    if (!isNaN(valor)) {
       
        if (miArbol.insertar(valor)) {
            if (cajaRecorridos) cajaRecorridos.style.display = 'none';
        
            animando = true; 
            nodoResaltado = valor; 
            
            dibujarArbol(true); 

            
            await sleep(1500); 

            nodoResaltado = null;
            animando = false;
            dibujarArbol(false);
        }
        input.value = '';
        input.focus();
    }
}


async function generarAleatoriosMultiples() {
    if (animando) return;
    let cant = parseInt(document.getElementById("input-cantidad").value);
    let min = parseInt(document.getElementById("input-min").value);
    let max = parseInt(document.getElementById("input-max").value);
    cerrarModalAleatorio();
    
    animando = true;
    colorActivo = "#d9825b"; 

    for(let i=0; i < cant; i++) {
        let v = Math.floor(Math.random() * (max - min + 1)) + min;
        if (miArbol.insertar(v)) {
            nodoResaltado = v;
            dibujarArbol(true);
            await sleep(1200); 
        }
    }
    nodoResaltado = null;
    animando = false;
    dibujarArbol(false);
}

function importarJSON(event) {
    const file = event.target.files[0];
    if (!file || animando) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const tempRaiz = JSON.parse(e.target.result);
            
            limpiarArbol(); 
            animando = true;
            colorActivo = "#d9825b"; 
            let nodosAnimar = [];
            miArbol.preorden(tempRaiz, nodosAnimar);
            for (let nodo of nodosAnimar) {
                miArbol.insertar(nodo.valor);
                nodoResaltado = nodo.valor;
                dibujarArbol(true);
              
                await sleep(1500); 


                nodoResaltado = null;
                dibujarArbol(false);
                
               
                await sleep(200); 
            }

            animando = false;
            event.target.value = ""; 
            console.log("Importación finalizada con éxito");
        } catch (err) {
            alert("Error al procesar el archivo JSON. Verifica el formato.");
            animando = false;
            event.target.value = "";
        }
    };
    reader.readAsText(file);
}

function limpiarArbol() {
    if (animando) return;
    miArbol = new ArbolBinario();
    nodoResaltado = null;
    dibujarArbol(true);
}


async function ejecutarReconstruccion() {
    const inStr = document.getElementById('input-recon-in').value.trim();
    const modo = document.querySelector('input[name="modo-recon"]:checked').value;
    const secStr = modo === 'pre' ? document.getElementById('input-recon-pre').value.trim() : document.getElementById('input-recon-post').value.trim();
    const parseArr = (str) => str.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
    
    const inArr = parseArr(inStr);
    const secArr = parseArr(secStr);

    if (inArr.length === 0 || secArr.length === 0 || inArr.length !== secArr.length) return alert("Datos incompatibles.");
    
    let nuevaRaiz = modo === 'pre' ? buildPreIn(secArr, inArr) : buildPostIn(secArr, inArr);
    if(!nuevaRaiz) return alert("Error en reconstrucción.");

    cerrarModalReconstruir();
    limpiarArbol();
    animando = true;

    let nodosAnimar = [];
    if (modo === 'pre') miArbol.preorden(nuevaRaiz, nodosAnimar);
    else miArbol.postorden(nuevaRaiz, nodosAnimar);

    for (let nodo of nodosAnimar) {
        miArbol.insertar(nodo.valor);
        nodoResaltado = nodo.valor;
        dibujarArbol(true);
        await sleep(500);
    }
    nodoResaltado = null;
    animando = false;
}


function buildPreIn(pre, ino) {
    if (pre.length === 0 || ino.length === 0) return null;
    let rootVal = pre[0];
    let root = new Nodo(rootVal);
    let mid = ino.indexOf(rootVal);
    if (mid === -1) return null; 
    root.izq = buildPreIn(pre.slice(1, mid + 1), ino.slice(0, mid));
    root.der = buildPreIn(pre.slice(mid + 1), ino.slice(mid + 1));
    return root;
}

function buildPostIn(post, ino) {
    if (post.length === 0 || ino.length === 0) return null;
    let rootVal = post[post.length - 1];
    let root = new Nodo(rootVal);
    let mid = ino.indexOf(rootVal);
    if (mid === -1) return null;
    root.izq = buildPostIn(post.slice(0, mid), ino.slice(0, mid));
    root.der = buildPostIn(post.slice(mid, post.length - 1), ino.slice(mid + 1));
    return root;
}


let modalCallback = null;
function abrirModal(titulo, callback = null) {
    document.getElementById("modal-title").textContent = titulo;
    const input = document.getElementById("modal-input");
    input.value = ""; 
    document.getElementById("modal-error").textContent = "";
    document.getElementById("modal").classList.add("active");
    modalCallback = callback;
    input.focus();
}
function cerrarModal() { document.getElementById("modal").classList.remove("active"); }
function confirmarModal() {
    const input = document.getElementById("modal-input");
    if (input.value.trim() === "") return document.getElementById("modal-error").textContent = "El campo no puede estar vacío.";
    if (modalCallback) modalCallback(input.value.trim());
    cerrarModal();
}

function exportarPNG() {
    if (!miArbol.raiz) return alert("Árbol vacío");
    abrirModal("Nombre de la imagen", (nombre) => {
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = canvas.width; tempCanvas.height = canvas.height;
        tempCtx.fillStyle = "white"; tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        tempCtx.drawImage(canvas, 0, 0);
        const link = document.createElement('a');
        link.download = (nombre || 'arbol') + '.png';
        link.href = tempCanvas.toDataURL('image/png');
        link.click();
    });
}

function exportarJSON() {
    if (!miArbol.raiz) return alert("Árbol vacío");
    abrirModal("Nombre del archivo JSON", (nombre) => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(miArbol.raiz));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", (nombre || "arbol") + ".json");
        downloadAnchorNode.click();
    });
}

function importarJSON(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const tempRaiz = JSON.parse(e.target.result);
            limpiarArbol(); animando = true;
            let nodosAnimar = []; miArbol.preorden(tempRaiz, nodosAnimar);
            for (let nodo of nodosAnimar) {
                miArbol.insertar(nodo.valor);
                nodoResaltado = nodo.valor;
                dibujarArbol(true); await sleep(400);
            }
            nodoResaltado = null; animando = false;
        } catch (err) { alert("Error JSON"); }
    };
    reader.readAsText(file);
}

function copiarRecorrido(id) {
    const texto = document.getElementById(id).textContent.split(' → ').join(', ');
    navigator.clipboard.writeText(texto).then(() => {
        const btn = event.target;
        btn.textContent = "¡Copiado!";
        setTimeout(() => btn.textContent = "Copiar", 1000);
    });
}

function abrirModalAleatorio() { document.getElementById("modal-aleatorio").classList.add("active"); }
function cerrarModalAleatorio() { document.getElementById("modal-aleatorio").classList.remove("active"); }
function abrirModalReconstruir() { document.getElementById("modal-reconstruir").classList.add("active"); }
function cerrarModalReconstruir() { document.getElementById("modal-reconstruir").classList.remove("active"); }
function abrirHelp() { document.getElementById("help-modal").classList.add("active"); }
function cerrarHelp() { document.getElementById("help-modal").classList.remove("active"); }

function generarTodosRecorridos() {
    if (animando || !miArbol.raiz) return;
    cajaRecorridos.style.display = 'block';
    let pre = [], ino = [], post = [];
    miArbol.preorden(miArbol.raiz, pre);
    miArbol.generarInorder(miArbol.raiz, ino);
    miArbol.postorden(miArbol.raiz, post);
    document.getElementById('res-pre').textContent = pre.map(n => n.valor).join(" → ");
    document.getElementById('res-in').textContent = ino.map(n => n.valor).join(" → ");
    document.getElementById('res-post').textContent = post.map(n => n.valor).join(" → ");
}

window.addEventListener('resize', () => dibujarArbol(true));
dibujarArbol();