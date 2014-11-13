/*
 * Conway's Game of Life (Seawolf Edition)
 *
 * This JavaScript file should contain the full implementation of
 * our Game of Life simulation. It does all data management, including
 * updating the game grid, as well as controlling frame rate timing
 * and all rendering to the canvas.
 *
 * Authors: Richard McKenna & Jesse Talavera-Greenberg
 */

// GAME OF LIFE GLOBAL CONSTANTS & VARIABLES

// CONSTANTS
// THESE REPRESENT THE TWO POSSIBLE STATES FOR EACH CELL
var DEAD_CELL = 0;
var LIVE_CELL = 1;

// COLORS FOR RENDERING
var LIVE_COLOR = '#F00';
var GRID_LINES_COLOR = '#CCC';
var TEXT_COLOR = '#77C';
var BG_COLOR = 'rgba(220, 220, 220, .5)';

// THESE REPRESENT THE DIFFERENT TYPES OF CELL LOCATIONS IN THE GRID
var TOP_LEFT = 0;
var TOP_RIGHT = 1;
var BOTTOM_LEFT = 2;
var BOTTOM_RIGHT = 3;
var TOP = 4;
var BOTTOM = 5;
var LEFT = 6;
var RIGHT = 7;
var CENTER = 8;



// FPS CONSTANTS
var MILLISECONDS_IN_ONE_SECOND = 1000;
var MAX_FPS = 30;
var MIN_FPS = 1;
var FPS_INC = 1;

// CELL LENGTH CONSTANTS
var MAX_CELL_LENGTH = 32;
var MIN_CELL_LENGTH = 1;
var CELL_LENGTH_INC = 2;
var GRID_LINE_LENGTH_RENDERING_THRESHOLD = 8;

// RENDERING LOCATIONS FOR TEXT ON THE CANVAS
var FPS_X = 20;
var FPS_Y = 450;
var CELL_LENGTH_X = 20;
var CELL_LENGTH_Y = 480;

var TONE_LENGTH = .5;

var scales = {
    "default": [65.41, 69.30, 77.78, 82.41, 92.50, 103.83, 116.54]
};

var wave;

var currentScale = scales['default'];

// FRAME RATE TIMING VARIABLES
var timer;
var fps;
var frameInterval;

// CANVAS VARIABLES
var canvasWidth;
var canvasHeight;
var canvas;
var canvas2D;

// GRID VARIABLES
var grid;

// RENDERING VARIABLES
var cellLength;

// PATTERN PIXELS
var patterns;
var cellLookup;
var imgDir;

var context;

// INITIALIZATION METHODS

/*
 * This method initializes the Game of Life, setting it up with
 * and empty grid, ready to accept additions at the request
 * of the user.
 */
function initGameOfLife() {
    // INIT THE RENDERING SURFACE
    initCanvas();

    // INIT ALL THE GAME-RELATED VARIABLES
    initGameOfLifeData();

    // INIT THE LOOKUP TABLES FOR THE SIMULATION
    initCellLookup();

    // LOAD THE PATTERNS FROM IMAGES
    initPatterns();

    // SETUP THE EVENT HANDLERS
    initEventHandlers();

    // RESET EVERYTHING, CLEARING THE CANVAS
    resetGameOfLife();

    try {
        context = new(window.AudioContext || window.webkitAudioContext)();

        var real = new Float32Array([0, 261.2,
            0.09739212651,
            0.032786739527,
            0.001225904321,
            0.024426840957,
            0.005598166791,
            0.000367453175,
            0.000774904557,
            0.000547045919,
            0.00075175028,
            0.000362975393,
            0.000125426575,
            0.000306903942,
            0.000141571806,
            0.000111883553,
            0.000185059163,
            0.000160757309,
            0.000246832455,
            0.000214639664,
            0.000100450696,
            0.000074958519,
            0.000068590463,
            0.000090672429,
            0.000082255047,
            0.000058066823,
            0.00006300047,
            0.000053690592,
            0.000046301069,
            0.000049790923,
            0.000043165567,
            0.000040338032
        ]);
        var imag = new Float32Array([0, 261.2,
            0.022020916788,
            0.353879760022,
            0.041728783158,
            0.016857566899,
            0.020900439633,
            0.011706270946,
            0.017277870526,
            0.018527552753,
            0.014431274941,
            0.012933574842,
            0.006878993083,
            0.010609891054,
            0.007308195516,
            0.006497471587,
            0.0083491277,
            0.007794246837,
            0.009735680393,
            0.008991505601,
            0.006155999112,
            0.00531749803,
            0.005086530636,
            0.005848598127,
            0.005570425525,
            0.004679955432,
            0.004874784042,
            0.00450009594,
            0.004178878133,
            0.004333544822,
            0.004034868033,
            0.003900450138
        ]);
        // These frequency tables are built from the coefficients of the Fourier series of  x / (1 + (x + 1)^2)
        wave = context.createPeriodicWave(real, imag);
    } catch (e) {
        alert(e + "\nThis browser doesn't support WebAudio.  Use a newer browser like Chrome or Firefox.");
    }


}

/*
 * This method retrieves the canvas from the Web page and
 * gets a 2D drawing context so that we can render to it
 * when the time comes.
 */
function initCanvas() {
    // GET THE CANVAS
    canvas = document.getElementById("game_of_life_canvas");

    // GET THE 2D RENDERING CONTEXT
    canvas2D = canvas.getContext("2d");

    // INIT THE FONT FOR TEXT RENDERED ON THE CANVAS. NOTE
    // THAT WE'LL BE RENDERING THE FRAME RATE AND ZOOM LEVEL
    // ON THE CANVAS
    canvas2D.font = "24px Arial";

    // NOTE THAT THESE DIMENSIONS SHOULD BE THE
    // SAME AS SPECIFIED IN THE WEB PAGE, WHERE
    // THE CANVAS IS SIZED
    canvasWidth = canvas.width;
    canvasHeight = canvas.height;
}

/*
 * This function initializes all the important game-related
 * variables, including the necessary data structures for
 * managing the game grid.
 */
function initGameOfLifeData() {
    // INIT THE TIMING DATA
    timer = null;
    fps = MAX_FPS;
    frameInterval = MILLISECONDS_IN_ONE_SECOND / fps;

    // INIT THE CELL LENGTH
    cellLength = MIN_CELL_LENGTH;
}

/*
 * This function returns a JavaScript object, which is kind of like
 * a C struct in that it only has data. There are 9 different types of
 * cells in the grid, and so we use 9 CellType objects to store which
 * adjacent cells need to be checked when running the simulation.
 */
function CellType(initNumNeighbors, initCellValues) {
    this.numNeighbors = initNumNeighbors;
    this.cellValues = initCellValues;
}

/*
 * This function initizlies the 9 CellType objects that serve
 * as a lookup table for when we are running the simulation so
 * that we know which neighboring cells have to be examined for
 * determining the next frame's state for a given cell.
 */
function initCellLookup() {
    // WE'LL PUT ALL THE VALUES IN HERE
    cellLookup = [];

    // TOP LEFT
    var topLeftArray = [1, 0, 1, 1, 0, 1];
    cellLookup[TOP_LEFT] = new CellType(3, topLeftArray);

    // TOP RIGHT
    var topRightArray = [-1, 0, -1, 1, 0, 1];
    cellLookup[TOP_RIGHT] = new CellType(3, topRightArray);

    // BOTTOM LEFT
    var bottomLeftArray = [1, 0, 1, -1, 0, -1];
    cellLookup[BOTTOM_LEFT] = new CellType(3, bottomLeftArray);

    // BOTTOM RIGHT
    var bottomRightArray = [-1, 0, -1, -1, 0, -1];
    cellLookup[BOTTOM_RIGHT] = new CellType(3, bottomRightArray);

    // TOP 
    var topArray = [-1, 0, -1, 1, 0, 1, 1, 1, 1, 0];
    cellLookup[TOP] = new CellType(5, topArray);

    // BOTTOM
    var bottomArray = [-1, 0, -1, -1, 0, -1, 1, -1, 1, 0];
    cellLookup[BOTTOM] = new CellType(5, bottomArray);

    // LEFT
    var leftArray = [0, -1, 1, -1, 1, 0, 1, 1, 0, 1];
    cellLookup[LEFT] = new CellType(5, leftArray);

    // RIGHT
    var rightArray = [0, -1, -1, -1, -1, 0, -1, 1, 0, 1];
    cellLookup[RIGHT] = new CellType(5, rightArray);

    // CENTER
    var centerArray = [-1, -1, -1, 0, -1, 1, 0, 1, 1, 1, 1, 0, 1, -1, 0, -1];
    cellLookup[CENTER] = new CellType(8, centerArray);
}

/*
 * This method initializes all the patterns that the user
 * may put into the simulation. This is done by reading in
 * the images listed in the drop-down list, and then examining
 * the contents of those images, considering anything that is
 * not white as a "LIVE_CELL". Note that this allows us to
 * easily add any new image we like as a pattern.
 */
function initPatterns() {
    // THIS IS WHERE ALL THE IMAGES SHOULD BE
    imgDir = "/img/";

    // THIS WILL STORE ALL THE PATTERNS IN AN ASSOCIATIVE ARRAY
    patterns = [];

    // GET THE DROP DOWN LIST
    var patternsList = document.getElementById("game_of_life_patterns");

    // GO THROUGH THE LIST AND LOAD ALL THE IMAGES
    for (var i = 0; i < patternsList.options.length; i++) {
        // GET THE NAME OF THE IMAGE FILE AND MAKE
        // A NEW ARRAY TO STORE IT'S PIXEL COORDINATES
        var key = patternsList.options[i].value;
        var pixelArray = [];

        // NOW LOAD THE DATA FROM THE IMAGE
        loadOffscreenImage(key, pixelArray);

        // AND PUT THE DATA IN THE ASSIATIVE ARRAY,
        // BY KEY
        patterns[key] = pixelArray;
    }
}

/*
 * This function initializes all the event handlers, registering
 * the proper response methods.
 */
function initEventHandlers() {
    // WE'LL RESPOND TO MOUSE CLICKS ON THE CANVAS
    canvas.onclick = respondToMouseClick;

    // AND ALL THE APP'S BUTTONS
    document.getElementById("reset_button").onclick = resetGameOfLife;

    var playpause = document.getElementById("play_pause");
    playpause.onclick = function() {
        if (timer === null) {
            startGameOfLife();
            playpause.value = "\u25AE\u25AE";
        } else {
            pauseGameOfLife();
            playpause.value = "\u25B6";
        }
    };
    document.getElementById("dec_fps_button").onclick = decFPS;
    document.getElementById("inc_fps_button").onclick = incFPS;
    document.getElementById("dec_cell_length_button").onclick = decCellLength;
    document.getElementById("inc_cell_length_button").onclick = incCellLength;
}

/*
 * This function loads the image and then examines it, extracting
 * all the pixels and saving the coordinates that are non-white.
 */
function loadOffscreenImage(imgName, pixelArray) {
    // FIRST GET THE IMAGE DATA
    var img = new Image();

    // NOTE THAT THE IMAGE WILL LOAD IN THE BACKGROUND, BUT
    // WE CAN TELL JavaScript TO LET US KNOW WHEN IT HAS FULLY
    // LOADED AND RESPOND THEN.
    img.onload = function() {
        respondToLoadedImage(imgName, img, pixelArray);
    };

    // document.URL IS THE URL OF WHERE THE WEB PAGE IS FROM WHICH THIS
    // JavaScript PROGRAM IS BEING USED. NOTE THAT ASSIGNING A URL TO
    // A CONSTRUCTED Image's src VARIABLE INITIATES THE IMAGE-LOADING
    // PROCESS
    var path = document.URL;
    img.src = path + imgDir + imgName;
}

// EVENT HANDLER METHODS

/*
 * This method is called in response to an Image having completed loading. We
 * respond by examining the contents of the image, and keeping the non-white
 * pixel coordinates in our patterns array so that the user may use those
 * patterns in the simulation.
 */
function respondToLoadedImage(imgName, img, pixelArray) {
    // WE'LL EXAMINE THE PIXELS BY FIRST DRAWING THE LOADED
    // IMAGE TO AN OFFSCREEN CANVAS. SO FIRST WE NEED TO
    // MAKE THE CANVAS, WHICH WILL NEVER ACTUALLY BE VISIBLE.
    var offscreenCanvas = document.createElement("canvas");
    offscreenCanvas.width = img.width;
    offscreenCanvas.height = img.height;
    var offscreenCanvas2D = offscreenCanvas.getContext("2d");
    offscreenCanvas2D.drawImage(img, 0, 0);

    // NOW GET THE DATA FROM THE IMAGE WE JUST DREW TO OUR OFFSCREEN CANVAS
    var imgData = offscreenCanvas2D.getImageData(0, 0, img.width, img.height);

    // THIS WILL COUNT THE FOUND NON-WHITE PIXLS
    var pixelArrayCounter = 0;

    // GO THROUGH THE IMAGE DATA AND PICK OUT THE COORDINATES
    for (var i = 0; i < imgData.data.length; i += 4) {
        // THE DATA ARRAY IS STRIPED RGBA, WE'LL IGNORE 
        // THE ALPHA CHANNEL
        var r = imgData.data[i];
        var g = imgData.data[i + 1];
        var b = imgData.data[i + 2];

        // KEEP THE PIXEL IF IT'S NON-WHITE
        if ((r < 255) && (g < 255) && (b < 255)) {
            // CALCULATE THE LOCAL COORDINATE OF
            // THE FOUND PIXEL. WE DO THIS BECAUSE WE'RE
            // NOT KEEPING ALL THE PIXELS
            var x = Math.floor((i / 4)) % img.width;
            var y = Math.floor(Math.floor((i / 4)) / img.width);

            // STORE THE COORDINATES OF OUR PIXELS
            pixelArray[pixelArrayCounter] = x;
            pixelArray[pixelArrayCounter + 1] = y;
            pixelArrayCounter += 2;
        }
    }
}

/*
 * This is the event handler for when the user clicks on the canvas,
 * which means the user wants to put a pattern in the grid at
 * that location.
 */
function respondToMouseClick(event) {
    // GET THE PATTERN SELECTED IN THE DROP DOWN LIST
    var patternsList = document.getElementById("game_of_life_patterns");
    var selectedPattern = patternsList.options[patternsList.selectedIndex].value;

    // LOAD THE COORDINATES OF THE PIXELS TO DRAW
    var pixels = patterns[selectedPattern];

    // CALCULATE THE ROW,COL OF THE CLICK
    var canvasCoords = getRelativeCoords(event);
    var clickCol = Math.floor(canvasCoords.x / cellLength);
    var clickRow = Math.floor(canvasCoords.y / cellLength);

    // GO THROUGH ALL THE PIXELS IN THE PATTERN AND PUT THEM IN THE GRID
    for (var i = 0; i < pixels.length; i += 2) {
        var col = clickCol + pixels[i];
        var row = clickRow + pixels[i + 1];
        grid.setCell(row, col, LIVE_CELL);
    }

    // RENDER THE GAME IMMEDIATELY
    renderGame();
}

/*
 * This function starts the simulation. Note that we don't want multiple
 * threads doing the same thing, so we first close the current thread, if
 * there is one. Once this method is called, the update and render are done
 * on a timed basis.
 */
function startGameOfLife() {
    // CLEAR OUT ANY OLD TIMER
    if (timer !== null) {
        clearInterval(timer);
    }

    // START A NEW TIMER
    timer = setInterval(stepGameOfLife, frameInterval);
}

/*
 * This function pauses the simulation such that the update and render
 * are no longer called on a timed basis.
 */
function pauseGameOfLife() {
    // TELL JavaScript TO STOP RUNNING THE LOOP
    clearInterval(timer);

    // AND THIS IS HOW WE'LL KEEP TRACK OF WHETHER
    // THE SIMULATION IS RUNNING OR NOT
    timer = null;
}

function Grid(width, height) {
    this.cells = [];
    this.next = [];
    this.width = width;
    this.height = height;
    this.newborns = {};
    this.cell_types = [];
    this._num_cells = (width * height) - 1;

    /*
     * This function tests to see if (row, col) represents a
     * valid cell in the grid. If it is a valid cell, true is
     * returned, else false.
     */
    this.isValidCell = function(row, col) {
        // IS IT INSIDE THE GRID?
        return (col < this.width) && (((row * width) + col) < this._num_cells);
    };

    this.setCell = function(row, col, value) {
        // IGNORE IF IT'S OUTSIDE THE GRID
        if (this.isValidCell(row, col)) {
            this.cells[(row * width) + col] = value;
        }
    };

    this.getCell = function(row, col) {
        // IGNORE IF IT'S OUTSIDE THE GRID
        return this.isValidCell(row, col) ? this.cells[(row * width) + col] : -1;
    };

    /*
     * A cell's type determines which adjacent cells need to be tested
     * during each frame of the simulation. This method tests the cell
     * at (row, col), and returns the constant representing which of
     * the 9 different types of cells it is.
     */
    this.determineCellType = function(row, col) {
        return this.cell_types[(row * width) + col];
    };

    function _getCellType(row, col) {
        if ((row === 0) && (col === 0)) return TOP_LEFT;
        else if ((row === 0) && (col === (width - 1))) return TOP_RIGHT;
        else if ((row === (height - 1)) && (col === 0)) return BOTTOM_LEFT;
        else if ((row === (height - 1)) && (col === (height - 1))) return BOTTOM_RIGHT;
        else if (row === 0) return TOP;
        else if (col === 0) return LEFT;
        else if (row === (height - 1)) return RIGHT;
        else if (col === (width - 1)) return BOTTOM;
        else return CENTER;
    };

    /*
     * This method counts the living cells adjacent to the cell at
     * (row, col). This count is returned.
     */
    this.calcLivingNeighbors = function(row, col) {
        var numLivingNeighbors = 0;

        // DEPENDING ON THE TYPE OF CELL IT IS WE'LL CHECK
        // DIFFERENT ADJACENT CELLS
        var cellType = this.determineCellType(row, col);
        var cellsToCheck = cellLookup[cellType];
        var vals = cellsToCheck.cellValues;
        for (var counter = 0; counter < (cellsToCheck.numNeighbors * 2); counter += 2) {
            var neighborCol = col + cellsToCheck.cellValues[counter];
            var neighborRow = row + cellsToCheck.cellValues[counter + 1];
            var index = (neighborRow * width) + neighborCol;
            var neighborValue = this.cells[index];
            numLivingNeighbors += neighborValue;
        }
        return numLivingNeighbors;
    };

    /*
     * This function is called each frame of the simulation and
     * it tests and updates each cell according to the rules
     * of Conway's Game of Life.
     */
    this.update = function() {
        this.newborns = [];
        for (var i = 0; i < height; i++) { // Row
            this.newborns[i] = [];
            for (var j = 0; j < width; j++) { // Columns
                // HOW MANY NEIGHBORS DOES THIS CELL HAVE?
                var numLivingNeighbors = this.calcLivingNeighbors(i, j);

                var testCell = this.getCell(i, j);

                // CASES
                // 1) IT'S ALIVE
                if (testCell === LIVE_CELL) {
                    if (numLivingNeighbors < 2 || numLivingNeighbors > 3) {
                        this.next[(i * width) + j] = DEAD_CELL;
                    }
                    // 1c 2 OR 3 LIVING NEIGHBORS, WE DO NOTHING
                    else {
                        this.next[(i * width) + j] = LIVE_CELL;
                    }
                }
                // 2) IT'S DEAD
                else if (numLivingNeighbors === 3) {
                    this.next[(i * width) + j] = LIVE_CELL;
                    this.newborns[i].push(j);
                } else {
                    this.next[(i * width) + j] = DEAD_CELL;
                }
            }
        }

        /*
         * We need one grid's cells to determine the grid's values for
         * the next frame. So, we update the render grid based on the contents
         * of the update grid, and then, after rending, we swap them, so that
         * the next frame we'll be progressing the game properly.
         */
        var temp = this.cells;
        this.cells = this.next;
        this.next = temp;
    };

    for (var i = 0; i < height; i++) {
        for (var j = 0; j < width; j++) {
            var index = (i * width) + j;
            this.cells[index] = DEAD_CELL;
            this.next[index] = DEAD_CELL;
            this.cell_types[index] = _getCellType(i, j);
        }
    }
}


/*
 * This function resets the grid containing the current state of the
 * Game of Life such that all cells in the game are dead.
 */
function resetGameOfLife() {
    grid = new Grid(canvasWidth / cellLength, canvasHeight / cellLength);

    // RENDER THE CLEARED SCREEN
    renderGame();
}

/*
 * This function decrements the frames per second used by the
 * the simulation.
 */
function decFPS() {
    // WE CAN'T HAVE A FRAME RATE OF 0 OR LESS
    if (fps > MIN_FPS) {
        // UPDATE THE FPS
        fps -= FPS_INC;
        frameInterval = 1000 / fps;

        // IF A SIMULATION IS ALREADY RUNNING,
        // RESTART IT WITH THE NEW FRAME RATE
        if (timer !== null) {
            startGameOfLife();
        }
        // OTHERWISE WE NEED TO RENDER A FRAME OURSELVES
        else {
            renderGame();
        }
    }
}

/*
 * This function increments the frames per second used by the
 * the simulation.
 */
function incFPS() {
    // WE'LL CAP THE FRAME RATE AT 33
    if (fps < MAX_FPS) {
        // UPDATE THE FPS
        fps += FPS_INC;
        frameInterval = MILLISECONDS_IN_ONE_SECOND / fps;

        // IF A SIMULATION IS ALREADY RUNNING,
        // RESTART IT WITH THE NEW FRAME RATE
        if (timer !== null) {
            startGameOfLife();
        }
        // OTHERWISE WE NEED TO RENDER A FRAME OURSELVES
        else {
            renderGame();
        }
    }
}

/*
 * This function decrements the cellLength factor for rendering. Note the
 * cellLength starts at 1, which is cellLengthed all the way out, where cells are
 * on a one-to-one ratio with pixels in the canvas. The numeric value
 * of the cellLength translates into the length of each side for each cell.
 */
function decCellLength() {
    // 1 IS THE LOWEST VALUE WE ALLOW
    if (cellLength > MIN_CELL_LENGTH) {
        // DEC THE CELL LENGTH
        cellLength /= CELL_LENGTH_INC;

        // AND RESET THE DATA STRUCTURES
        resetGameOfLife();

        // IF WE DON'T HAVE AN UPDATE/RENDER LOOP
        // RUNNING THEN WE HAVE TO FORCE A ONE-TIME
        // RENDERING HERE
        if (timer === null) {
            renderGame();
        }
    }
}

/*
 * This function increments the cellLength factor for rendering. Note the
 * cellLength starts at 1, which is cellLengthed all the way out, where cells are
 * on a one-to-one ratio with pixels in the canvas. The numeric value
 * of the cellLength translates into the length of each side for each cell.
 */
function incCellLength() {
    // 100 IS THE LARGEST VALUE WE ALLOW
    if (cellLength < MAX_CELL_LENGTH) {
        // INC THE CELL LENGTH
        cellLength *= CELL_LENGTH_INC;

        // AND RESET THE DATA STRUCTURES
        resetGameOfLife();

        // IF WE DON'T HAVE AN UPDATE/RENDER LOOP
        // RUNNING THEN WE HAVE TO FORCE A ONE-TIME
        // RENDERING HERE
        if (timer === null) {
            renderGame();
        }
    }
}

// HELPER METHODS FOR THE EVENT HANDLERS

/*
 * This function gets the mouse click coordinates relative to
 * the canvas itself, where 0,0 is the top, left corner of
 * the canvas.
 */
function getRelativeCoords(event) {
    if (event.offsetX !== undefined && event.offsetY !== undefined) {
        return {
            x: event.offsetX,
            y: event.offsetY
        };
    } else {
        return {
            x: event.layerX,
            y: event.layerY
        };
    }
}

/*
 * Called each frame on a timed basis, this method updates the grid
 * and renders the simulation.
 */
function stepGameOfLife() {
    // FIRST PERFORM GAME LOGIC
    grid.update();

    playNotes(grid);

    // RENDER THE GAME
    renderGame();
}

function playNotes(grid) {
    var bins = [];
    for (var i = 0; i < 32; ++i) {
        bins[i] = 0;
    }

    var newborns = grid.newborns;

    for (var r = 0; r < newborns.length; ++r) {
        var cols = newborns[r];
        var gain_row = Math.floor(((grid.height - r) / grid.height) * 32);
        if (cols.length > 0) {
            for (var c = 0; c < cols.length; ++c) {
                var bin = Math.floor(cols[c] / grid.width * 32);
                bins[bin] += gain_row;
            }
        }
    }

    var limit = 0;
    for (var k = 0; limit < 16 && k < bins.length; ++k) {
        if (bins[k] > 0) {
            ++limit;
            var osc = context.createOscillator();

            var freq = currentScale[k % currentScale.length];
            var factor = Math.pow(2, Math.floor(k / currentScale.length));
            osc.frequency.value = freq * factor;
            osc.type = 'custom';
            osc.setPeriodicWave(wave);

            var gain = context.createGain();
            gain.gain.value = Math.log2(bins[k]) / (bins[k]);

            var filter = context.createBiquadFilter();
            filter.frequency.value = freq;

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(context.destination);

            osc.start();
            gain.gain.linearRampToValueAtTime(gain.gain.value, context.currentTime + TONE_LENGTH / 2);
            gain.gain.linearRampToValueAtTime(0, context.currentTime + TONE_LENGTH);
            osc.stop(context.currentTime + TONE_LENGTH);
        }
    }

    //console.log(bins);
}

/*
 * This function renders a single frame of the simulation, including
 * the grid itself, as well as the text displaying the current
 * fps and cellLength levels.
 */
function renderGame() {
    // CLEAR THE CANVAS
    canvas2D.clearRect(0, 0, canvasWidth, canvasHeight);

    canvas2D.fillStyle = BG_COLOR;
    for (var k = 0; k < 32; k += 2) {
        canvas2D.fillRect(k * canvasWidth / 32, 0, canvasWidth / 32, canvasHeight);
        canvas2D.fillRect(0, k * canvasHeight / 16, canvasWidth, canvasHeight / 16);
    }

    // RENDER THE GRID LINES, IF NEEDED
    if (cellLength >= GRID_LINE_LENGTH_RENDERING_THRESHOLD)
        renderGridLines();

    // RENDER THE GAME CELLS
    renderCells(grid);

    // AND RENDER THE TEXT
    renderText();
}

/*
 * Renders the cells in the game grid, with only the live
 * cells being rendered as filled boxes. Note that boxes are
 * rendered according to the current cell length.
 */
function renderCells(grid) {
    // SET THE PROPER RENDER COLOR
    canvas2D.fillStyle = LIVE_COLOR;

    // RENDER THE LIVE CELLS IN THE GRID
    for (var i = 0; i <= grid.height; i++) {
        for (var j = 0; j < grid.width; j++) {
            var cell = grid.getCell(i, j);
            if (cell === LIVE_CELL) {
                var x = j * cellLength;
                var y = i * cellLength;
                canvas2D.fillRect(x, y, cellLength, cellLength);
            }
        }
    }
}

/*
 * Renders the text on top of the grid.
 */
function renderText() {
    // SET THE PROPER COLOR
    canvas2D.fillStyle = TEXT_COLOR;

    // RENDER THE TEXT
    canvas2D.fillText("FPS: " + fps, FPS_X, FPS_Y);
    canvas2D.fillText("Cell Length: " + cellLength, CELL_LENGTH_X, CELL_LENGTH_Y);
}

/*
 * Renders the grid lines.
 */
function renderGridLines() {
    // SET THE PROPER COLOR

    canvas2D.strokeStyle = GRID_LINES_COLOR;
    // VERTICAL LINES
    canvas2D.beginPath();
    for (var i = 0; i < grid.width; i++) {
        var x1 = i * cellLength;
        var y1 = 0;
        var x2 = x1;
        var y2 = canvasHeight;
        canvas2D.moveTo(x1, y1);
        canvas2D.lineTo(x2, y2);
    }

    // HORIZONTAL LINES
    for (var j = 0; j < grid.height; j++) {
        var x1 = 0;
        var y1 = j * cellLength;
        var x2 = canvasWidth;
        var y2 = y1;
        canvas2D.moveTo(x1, y1);
        canvas2D.lineTo(x2, y2);
    }

    canvas2D.stroke();
    canvas2D.closePath();
}
