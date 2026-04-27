const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let nodos = [];
let aristas = [];
let modo = "nodo";
let nodoSeleccionado = null;
let nodoHover = null;
let radio = 30;
let ultimoTipo = 'min';

let nodoArrastrado = null;
let dragHasMoved = false;
let offsetLinea = 0;

const COLOR_SOLUCION = "#e99897"; // Rojo solicitado
const COLOR_EVALUANDO = "#abcbd3"; // Azul de evaluación

// --- UTILIDADES DE COLOR ---
function generarColor() {
    const colores = [
        "#c8c29e", "#e99897", "#abcbd3", "#ffc98d",
        "#e1d3b6", "#c0a290", "#ffb284", "#2a9d8f", "#ff9f1c",
    ];
    return colores[Math.floor(Math.random() * colores.length)];
}

function oscurecerHex(hex, factor) {
    let r = parseInt(hex.slice(1, 3), 16);
    let g = parseInt(hex.slice(3, 5), 16);
    let b = parseInt(hex.slice(5, 7), 16);

    r = Math.max(0, Math.floor(r * (1 - factor)));
    g = Math.max(0, Math.floor(g * (1 - factor)));
    b = Math.max(0, Math.floor(b * (1 - factor)));

    const toHex = (c) => c.toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// --- MOTOR VISUAL (CON BOUNCE FLUIDO) ---
function animar() {
    offsetLinea -= 0.5;

    // Interpolación para el BOUNCE REAL (escala suave)
    nodos.forEach(n => {
        if (n.scale === undefined) n.scale = 1.0;
        let targetScale = (n === nodoSeleccionado || n === nodoHover) ? 1.15 : 1.0;
        n.scale += (targetScale - n.scale) * 0.2; // Transición suave
    });

    dibujar();
    requestAnimationFrame(animar);
}
animar();

function obtenerNodo(x, y) {
    return nodos.find(n => Math.hypot(n.x - x, n.y - y) <= radio);
}

function obtenerArista(x, y) {
    for (let a of aristas) {
        let mx = (a.desde.x + a.hasta.x) / 2;
        let my = (a.desde.y + a.hasta.y) / 2;
        if (Math.hypot(mx - x, my - y) <= 20) return a;
    }
    return null;
}

// --- DIBUJO ---
function dibujar() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Aristas
    aristas.forEach(a => {
        ctx.beginPath();
        ctx.moveTo(a.desde.x, a.desde.y);
        ctx.lineTo(a.hasta.x, a.hasta.y);

        ctx.lineWidth = (a.enSolucion || a.evaluando) ? 6 : 2;

        // Color actual de la línea dependiendo del estado
        let colorActual = a.enSolucion ? COLOR_SOLUCION : (a.evaluando ? COLOR_EVALUANDO : (a.color || "#999999"));
        ctx.strokeStyle = colorActual;

        if (a.enSolucion || a.evaluando) {
            ctx.setLineDash([10, 10]);
            ctx.lineDashOffset = offsetLinea;
        } else {
            ctx.setLineDash([]);
        }
        ctx.stroke();
        ctx.setLineDash([]);

        // Pesos (Borde blanco grueso y relleno oscurecido)
        let mx = (a.desde.x + a.hasta.x) / 2;
        let my = (a.desde.y + a.hasta.y) / 2;
        ctx.font = "bold 16px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.lineWidth = 4;
        ctx.strokeStyle = "white"; // Borde blanco alrededor del texto
        ctx.strokeText(a.peso, mx, my);

        // Relleno del texto oscurecido basado en el color de su línea
        ctx.fillStyle = oscurecerHex(colorActual, 0.4);
        ctx.fillText(a.peso, mx, my);
    });

    // Nodos
    nodos.forEach(n => {
        const esSeleccionado = (n === nodoSeleccionado || n === nodoHover);

        ctx.save();
        ctx.translate(n.x, n.y);
        ctx.scale(n.scale, n.scale); // Aplica el Bounce fluido

        if (esSeleccionado) {
            ctx.shadowColor = "rgba(217, 130, 91, 0.6)"; // Sombra naranja
            ctx.shadowBlur = 15;

            // Degradado Naranja exacto cuando se selecciona o toca
            let grad = ctx.createRadialGradient(-5, -5, 5, 0, 0, radio);
            grad.addColorStop(0, "#e8a16c");
            grad.addColorStop(1, "#d9825b");
            ctx.fillStyle = grad;
            ctx.strokeStyle = "#b54c1f";
        } else {
            ctx.shadowBlur = 0;
            // Blanco puro (sin el degradado gris horrible)
            ctx.fillStyle = "#ffffff";
            ctx.strokeStyle = "#d9825b";
        }

        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, radio, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Letras perfectamente centradas (naranja normal, blanco seleccionado)
        ctx.fillStyle = esSeleccionado ? "#ffffff" : "#d9825b";
        ctx.font = "bold 15px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(n.nombre, 0, 0);

        ctx.restore();
    });
}

// --- EVENTOS DE MOUSE ---
canvas.onmousedown = (e) => {
    const x = e.offsetX, y = e.offsetY;
    if (modo === "editar") {
        nodoArrastrado = obtenerNodo(x, y);
        dragHasMoved = false;
    }
};

canvas.onmousemove = (e) => {
    const x = e.offsetX, y = e.offsetY;
    if (nodoArrastrado) {
        nodoArrastrado.x = x;
        nodoArrastrado.y = y;
        dragHasMoved = true;
    }
    nodoHover = obtenerNodo(x, y);
};

canvas.onmouseup = () => nodoArrastrado = null;

canvas.onclick = (e) => {
    if (dragHasMoved) return;
    const x = e.offsetX, y = e.offsetY;
    const nodo = obtenerNodo(x, y);
    const arista = obtenerArista(x, y);

    if (modo === "nodo" && !nodo) {
        abrirModal("Nombre del Nodo", (val) => {
            if (val) nodos.push({ x, y, nombre: val, id: Date.now(), scale: 1.0 });
        });
    } else if (modo === "arista" && nodo) {
        if (!nodoSeleccionado) nodoSeleccionado = nodo;
        else if (nodoSeleccionado !== nodo) {
            abrirModal("Peso de la Arista", (val) => {
                let p = parseFloat(val);
                // Aquí asignamos el color usando generarColor()
                if (!isNaN(p)) aristas.push({ desde: nodoSeleccionado, hasta: nodo, peso: p, enSolucion: false, evaluando: false, color: generarColor() });
                nodoSeleccionado = null;
            });
        } else {
            nodoSeleccionado = null; // Deseleccionar si se hace click en el mismo
        }
    } else if (modo === "editar") {
        if (nodo) abrirModal("Editar Nombre", (v) => { if (v) nodo.nombre = v; });
        else if (arista) abrirModal("Editar Peso", (v) => { let p = parseFloat(v); if (!isNaN(p)) arista.peso = p; });
    } else if (modo === "borrar") {
        if (nodo) {
            nodos = nodos.filter(n => n !== nodo);
            aristas = aristas.filter(a => a.desde !== nodo && a.hasta !== nodo);
        } else if (arista) aristas = aristas.filter(a => a !== arista);
    }
};

// --- LOGICA KRUSKAL ---
class UnionFind {
    constructor(nodos) {
        this.p = {};
        nodos.forEach(n => this.p[n.id] = n.id);
    }
    find(i) { return (this.p[i] === i) ? i : (this.p[i] = this.find(this.p[i])); }
    union(i, j) {
        let rootI = this.find(i), rootJ = this.find(j);
        if (rootI !== rootJ) { this.p[rootI] = rootJ; return true; }
        return false;
    }
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function ejecutarKruskal(tipo, animar = false) {
    if (nodos.length < 2) return;
    ultimoTipo = tipo;
    aristas.forEach(a => { a.enSolucion = false; a.evaluando = false; });

    let aristasOrd = [...aristas].sort((a, b) => tipo === 'min' ? a.peso - b.peso : b.peso - a.peso);
    let uf = new UnionFind(nodos);
    let pesoTotal = 0;

    for (let a of aristasOrd) {
        if (animar) {
            a.evaluando = true;
            await sleep(600);
        }
        if (uf.union(a.desde.id, a.hasta.id)) {
            a.enSolucion = true;
            pesoTotal += a.peso;
        }
        if (animar) {
            a.evaluando = false;
            await sleep(200);
        }
    }

    document.getElementById("btn-explicar").disabled = false;

    // Solo muestra el modal del peso si se presionó Explicar Paso a Paso
    if (animar) {
        abrirModal(`Kruskal (${tipo === 'min' ? 'Mín' : 'Máx'}) Finalizado`, null);
        const errEl = document.getElementById("modal-error");
        errEl.textContent = "Peso Total: " + pesoTotal;
        errEl.style.color = COLOR_SOLUCION;
        errEl.style.display = "block";
    }
}

function prepararExplicacion() { ejecutarKruskal(ultimoTipo, true); }

// --- EXPORTAR / IMPORTAR ---
function exportarGrafo() {
    abrirModal("Nombre del archivo", (nombre) => {
        if (!nombre) return;
        // Guardamos el color de cada arista en el JSON
        const data = JSON.stringify({ nodos, aristas: aristas.map(a => ({ desdeId: a.desde.id, hastaId: a.hasta.id, peso: a.peso, color: a.color })) });
        const blob = new Blob([data], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = nombre + ".json";
        link.click();
    });
}

function importarGrafo(event) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const data = JSON.parse(e.target.result);
        nodos = data.nodos.map(n => ({ ...n, scale: 1.0 })); // Importante darle escala 1 al cargar
        aristas = data.aristas.map(a => ({
            desde: nodos.find(n => n.id === a.desdeId),
            hasta: nodos.find(n => n.id === a.hastaId),
            peso: a.peso,
            color: a.color || generarColor(), // <- Si no tiene color (JSON viejo), le crea uno
            enSolucion: false,
            evaluando: false
        }));
    };
    reader.readAsText(event.target.files[0]);
    // Limpiamos el input de archivo para que deje importar el mismo dos veces seguidas
    event.target.value = '';
}

// --- MODAL Y UTILS ---
let modalCb = null;

function abrirModal(tit, cb) {
    document.getElementById("modal-title").textContent = tit;
    const input = document.getElementById("modal-input");
    input.value = "";
    input.style.display = cb ? "block" : "none";

    // LIMPIEZA CRÍTICA: Borrar rastro de cualquier mensaje
    const errEl = document.getElementById("modal-error");
    errEl.textContent = "";
    errEl.style.display = "none";

    document.getElementById("modal").classList.add("active");
    modalCb = cb;
    if (cb) input.focus();
}

function cerrarModal() {
    document.getElementById("modal").classList.remove("active");
}

function confirmarModal() {
    if (modalCb) modalCb(document.getElementById("modal-input").value);
    cerrarModal();
}

function abrirHelp() { document.getElementById("help-modal").classList.add("active"); }
function cerrarHelp() { document.getElementById("help-modal").classList.remove("active"); }

function cambiarModo(m, b) {
    modo = m; nodoSeleccionado = null;
    document.querySelectorAll(".modo-btn").forEach(btn => btn.classList.remove("activo"));
    b.classList.add("activo");
}

function limpiarGrafo() {
    nodos = [];
    aristas = [];
    document.getElementById("btn-explicar").disabled = true;
}