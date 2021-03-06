document.addEventListener('DOMContentLoaded', function() {
    "use strict";
    const c = document.querySelector('#c');
    const d = document.querySelector('#d');
    const i = document.querySelector('#i');
    const s = document.querySelector('#start');
    const img = new Image();

    const cctx = c.getContext('2d');
    const dctx = d.getContext('2d');

    let algoRunning = false;
    let w = window.innerWidth,
        h = window.innerHeight;

    c.width = w / 2 - 16;
    c.height = h - 16 - 80;
    d.width = w / 2 - 16;
    d.height = h - 16 - 80;

    let dx, dy, dw, dh;
    let toClear0, toClear1;
    let maxr;
    let calculateDrawingArea = function() {
        let canvasRatio = c.height / c.width,
            imageRatio = img.height / img.width;

        if (imageRatio === canvasRatio) {
            dx = 0;
            dy = 0;
            dw = c.width;
            dh = c.height;
            toClear0 = null;
            toClear1 = null;
        } else if (imageRatio < canvasRatio) {
            dw = c.width;
            dh = dw * imageRatio;
            dx = 0;
            dy = c.height / 2 - dh / 2;
            toClear0 = [0, 0, dw, (d.height - dh) / 2];
            toClear1 = [0, dh + (d.height - dh) / 2, dw, (d.height - dh) / 2];
        } else {
            dh = c.height;
            dw = dh / imageRatio;
            dy = 0;
            dx = c.width / 2 - dw / 2;
            toClear0 = [0, 0, (d.width - dw) / 2, dh];
            toClear1 = [(dw + (d.width - dw) / 2), 0, (d.width - dw) / 2, dh];
        }
        maxr = Math.max(dw, dh);
    };

    img.onload = function() {
        calculateDrawingArea();
        cctx.clearRect(0, 0, c.width, c.height);
        cctx.drawImage(img, 
                0, 0, img.width, img.height,
                dx, dy, dw, dh);
        algoRunning = false;
    };

    i.addEventListener('change', function () {
        if (i.files.length > 0) {
            let oFReader = new FileReader();
            oFReader.onload = function (oFREvent) {
                img.src = oFREvent.target.result;
            };
            oFReader.readAsDataURL(i.files[0]);
        }
    });

    // Returns the negative value of the difference in pixel values.
    // We do not bother to calculate the average since the drawing
    // area is always the same size.
    let calculateFitness = function() {
        let cImgData = cctx.getImageData(dx, dy, dw, dh);
        let dImgData = dctx.getImageData(dx, dy, dw, dh);
        let n = Math.min(cImgData.data.length, dImgData.data.length);
        let e = 0;
        for (let i = 0; i < n; i++) {
            e += Math.abs(dImgData.data[i] - cImgData.data[i]);
        }
        return -e / n;
    };

    // To hold the population
    let genePool = [];

    let sortGenePoolByFitness = function() {
        genePool.sort(function(a, b) {
            return b.fitness - a.fitness;
        });
        /*
        for (let i = 1, len = genePool.length; i < len; i++) {
            if (genePool[i].fitness > genePool[i - 1].fitness) {
                for (let j = 0; j < len; j++) {
                    console.log(genePool[j].fitness);
                }
                throw 1;
            }
        }*/
    };

    let geneMutationRate = 0.3;
    let populationSize = 40;
    let q = 10;
    let half = 27;

    let getRandomNumber = function(min, max) {
        let poss = max - min + 1;
        return Math.floor(min) + Math.floor(Math.random() * poss);
    };

    let mutateInRange = function(oldValue, mn, mx) {
        let value = oldValue * (0.8 + Math.random() * 0.4);
        if (value > mx)
            return mx;
        if (value < mn)
            return mn;
        return value;
    };

    class Gene {
        constructor(cfg) {
            if (cfg === undefined)
                cfg = {};
            this.cx = cfg.cx || getRandomNumber(dx, dx + dw);
            this.cy = cfg.cy || getRandomNumber(dy, dy + dh);
            this.r = cfg.r || getRandomNumber(1, maxr / 4);
            this.rr = cfg.rr || getRandomNumber(0, 255);
            this.gg = cfg.gg || getRandomNumber(0, 255); 
            this.bb = cfg.bb || getRandomNumber(0, 255);
            this.aa = cfg.aa || Math.random() / 1.5;
        }

        mutate() {
            this.cx = mutateInRange(this.cx, dx, dx + dw);
            this.cy = mutateInRange(this.cy, dy, dy + dh);
            this.r = mutateInRange(this.r, 1, maxr / 4);
            this.rr = mutateInRange(this.rr, 0, 255);
            this.gg = mutateInRange(this.gg, 0, 255); 
            this.bb = mutateInRange(this.bb, 0, 255);
            this.aa = mutateInRange(this.aa, 0.01, 0.7);
        }

        getCopy() {
            return new Gene(this);
        }
    }

    class Genome {
        constructor() {
            this.genes = [];
            this.fitness = null;
        }

        /* Takes half of each */
        mateWith(other) {
            let newGenome = new Genome();
            let thisLength = this.genes.length,
                otherLength = other.genes.length;
            let len = Math.max(thisLength, otherLength);

            for (let i = 0; i < len; i++) {
                if (i >= thisLength) {
                    newGenome.genes.push(other.genes[i].getCopy());
                } else if (i >= otherLength) {
                    newGenome.genes.push(this.genes[i].getCopy());
                } else {
                    if (Math.random() <= 0.5) {
                        newGenome.genes.push(other.genes[i].getCopy());
                    } else {
                        newGenome.genes.push(this.genes[i].getCopy());
                    }
                }
            }
            return newGenome;
        }

        mutate() {
            // mutate gene
            for (let i = 0, len = this.genes.length; i < len; i++) {
                if (Math.random() <= geneMutationRate) {
                    this.genes[i].mutate();
                }
            }
        }

        /* Puts things on the canvas */
        showPhenotype() {
            for (let i = 0, len = this.genes.length; i < len; i++) {
                let g = this.genes[i];
                dctx.fillStyle = `rgba(${g.rr}, ${g.gg}, ${g.bb}, ${g.aa})`;
                dctx.beginPath();
                dctx.arc(g.cx, g.cy, g.r, 0, 2 * Math.PI);
                dctx.fill();
            }
            // clear frame
            if (toClear0) {
                dctx.clearRect(toClear0[0], toClear0[1], toClear0[2], toClear0[3]);
                dctx.clearRect(toClear1[0], toClear1[1], toClear1[2], toClear1[3]);
            }
        }
    }

    // Initialize the population
    let initializeGenePool = function() {
        for (let i = 0; i < populationSize; i++) {
            let x = new Genome();
            // Begin with one gene
            x.genes.push(new Gene());
            genePool.push(x);
        }
    };

    let oldFitness = null,
        roundsWithoutImprovement = 0;

    let breedNextGeneration = function() {
        let tmpGenePool = [];
        let len = genePool.length;
        let lengthen = false;
        if (roundsWithoutImprovement >= 19) {
            roundsWithoutImprovement = 0;
            lengthen = true;
        }
        for (let i = 0; i < len; i++) {
            var tmp;
            if (i <= q) {
                tmp = genePool[i];
            } else if (i <= half) {
                tmp = genePool[i];
                tmp.mutate();
            } else {
                tmp = genePool[i].mateWith(
                        tmpGenePool[Math.floor(Math.random() * (half + 1))]
                );
                tmp.mutate();
            }
            if (lengthen)
                tmp.genes.push(new Gene());
            tmpGenePool.push(tmp);
        }
        genePool = tmpGenePool;
    };

    let genNumber = 0;
    let runGA = function(maxGen) {
        genNumber++;
        console.log(`Start running round ${genNumber}`);
        for (let j = 0, len = genePool.length; j < len; j++) {
            dctx.clearRect(0, 0, c.width, c.height);
            genePool[j].showPhenotype();
            genePool[j].fitness = calculateFitness();
        }

        sortGenePoolByFitness();
        if (oldFitness === null || genePool[0].fitness > oldFitness) {
            oldFitness = genePool[0].fitness;
            roundsWithoutImprovement = 0;
        } else {
            oldFitness = genePool[0].fitness;
            roundsWithoutImprovement++;
        }

        // TODO: remove me
        console.log(`Rounds without improvement = ${roundsWithoutImprovement}`);

        genePool[0].showPhenotype();

        breedNextGeneration();

        if (genNumber < maxGen) {
            setTimeout(function() {
                runGA(maxGen);
            }, 50);
        }
    };

    // Kick off the algorithm
    s.addEventListener('click', function() {
        if (!algoRunning) {
            algoRunning = true;
            initializeGenePool();
            // Number of rounds
            runGA(100000);
        }
    });

});
