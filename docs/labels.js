/* Generated - display names, notes, frame time and setting ranges.
   Regenerate with docs/wasm/build.sh; hand edits to labels survive. */
var SKETCH_LABELS = [
{
"file": "Animation recreations/Loading.cpp",
"name": "Loading",
"note": "Sixteen dots on one path, each a little behind the last",
"ms": 16,
"params": []
},
{
"file": "Animation recreations/PSP.cpp",
"name": "PSP",
"note": "The PSP XMB wave, on 16-bit noise",
"ms": 16,
"params": [
{
"k": "col",
"label": "col",
"def": 150.0,
"min": 0,
"max": 600
}
]
},
{
"file": "Any recreations/Bengal fire.cpp",
"name": "Bengal fire",
"note": "A sparkler: white sparks that colour up as they fall",
"ms": 16,
"params": [
{
"k": "GenPosVar",
"label": "GenPosVar",
"def": 0.0,
"opts": [
"Off",
"On"
]
},
{
"k": "Bounce",
"label": "Bounce",
"def": 0.0,
"opts": [
"Off",
"On"
]
},
{
"k": "GravityX",
"label": "GravityX",
"def": 0.0,
"opts": [
"Off",
"On"
]
},
{
"k": "GravityY",
"label": "GravityY",
"def": 1.0,
"opts": [
"Off",
"On"
]
},
{
"k": "SpeedDecY",
"label": "SpeedDecY",
"def": 0.0,
"min": 0,
"max": 1
}
]
},
{
"file": "Any recreations/DNA.cpp",
"name": "DNA",
"note": "Two strands, one row at a time",
"ms": 16,
"params": []
},
{
"file": "Any recreations/DistLines.cpp",
"name": "Dist Lines",
"note": "Three noise-walked nodes, linked whenever they drift close",
"ms": 16,
"params": [
{
"k": "COUNTS",
"label": "COUNTS",
"def": 3.0,
"min": 0,
"max": 12
},
{
"k": "SPEED",
"label": "SPEED",
"def": 1.0,
"min": 0,
"max": 4
}
]
},
{
"file": "Any recreations/Drop.cpp",
"name": "Drop",
"note": "Rings spreading from raindrops, on a water palette",
"ms": 16,
"params": []
},
{
"file": "Any recreations/Infinity.cpp",
"name": "Infinity",
"note": "One dot on two beats, drawing a lissajous",
"ms": 16,
"params": []
},
{
"file": "Any recreations/Langton Ant.cpp",
"name": "Langton's Ant",
"note": "Eight ants, one rule, sixty seconds before the reset",
"ms": 16,
"params": [
{
"k": "restart",
"label": "Restart (s), 0 = off",
"def": 60.0,
"min": 0.0,
"max": 180.0
}
]
},
{
"file": "Any recreations/Mirage.cpp",
"name": "Mirage",
"note": "Three dots feeding a diffusion buffer, read as saturation",
"ms": 16,
"params": []
},
{
"file": "Any recreations/S.a.n.d..cpp",
"name": "S.a.n.d.",
"note": "Falling sand that collapses once the pile reaches the mark",
"ms": 16,
"params": [
{
"k": "speed",
"label": "Speed",
"def": 196.0,
"min": 1.0,
"max": 255.0
},
{
"k": "var",
"label": "var",
"def": 0.0,
"min": 0,
"max": 1
}
]
},
{
"file": "Any recreations/Snow.cpp",
"name": "Snow",
"note": "Falling flakes over a noise drift",
"ms": 16,
"params": []
},
{
"file": "Any recreations/Soap Bubble recreation.cpp",
"name": "Soap",
"note": "Stefan Petrick's soap: the panel drags itself along a noise field",
"ms": 16,
"params": []
},
{
"file": "Any recreations/Swirl.cpp",
"name": "Swirl",
"note": "Seven dot pairs smeared by a beating blur",
"ms": 16,
"params": [
{
"k": "Speed",
"label": "Speed",
"def": 240.0,
"min": 0,
"max": 960
},
{
"k": "DotsX2",
"label": "DotsX2",
"def": 7.0,
"min": 0,
"max": 28
}
]
},
{
"file": "Any recreations/Twinking.cpp",
"name": "Twinkling",
"note": "Every pixel breathes on its own, walking the strip",
"ms": 16,
"params": []
},
{
"file": "Classic Demoeffects recreations/Amiga Boing!.cpp",
"name": "Amiga Boing!",
"note": "The 1984 demo ball, checker and all",
"ms": 16,
"params": []
},
{
"file": "Classic Demoeffects recreations/Checkerboard.cpp",
"name": "Checkerboard",
"note": "Four XOR grids sliding over each other",
"ms": 16,
"params": []
},
{
"file": "Classic Demoeffects recreations/Drift rose pattern.cpp",
"name": "Drift rose",
"note": "36 dots, each on its own bpm, tracing a rose",
"ms": 16,
"params": []
},
{
"file": "Classic Demoeffects recreations/Starfield.cpp",
"name": "Starfield",
"note": "Perspective-divided starfield",
"ms": 16,
"params": []
},
{
"file": "Classic Demoeffects recreations/Xor Circles.cpp",
"name": "Xor Circles",
"note": "Two distance fields XORed together",
"ms": 16,
"params": []
},
{
"file": "Other/Blobs.cpp",
"name": "Blobs",
"note": "Breathing metaball-ish balls, sub-pixel drawn",
"ms": 16,
"params": [
{
"k": "Speed",
"label": "Speed",
"def": 255.0,
"min": 0,
"max": 1020
},
{
"k": "Am",
"label": "Am",
"def": 64.0,
"min": 0,
"max": 256
},
{
"k": "regime",
"label": "Regime",
"def": 1.0,
"opts": [
"Small",
"Big"
]
},
{
"k": "SubPixel",
"label": "SubPixel",
"def": 1.0,
"opts": [
"Off",
"On"
]
}
]
},
{
"file": "Other/Bombs.cpp",
"name": "Bombs",
"note": "Shells that arc up, stall, and go off",
"ms": 16,
"params": [
{
"k": "SpeedK",
"label": "SpeedK",
"def": 6.0,
"min": 0,
"max": 24
},
{
"k": "SpeedDecX",
"label": "SpeedDecX",
"def": 1.0,
"min": 0,
"max": 4
},
{
"k": "FadeSpK",
"label": "FadeSpK",
"def": 16.0,
"min": 0,
"max": 64
},
{
"k": "Board",
"label": "Board",
"def": 1.0,
"opts": [
"Off",
"On"
]
},
{
"k": "limiter",
"label": "limiter",
"def": 383.0,
"min": 0,
"max": 1532
}
]
},
{
"file": "Other/Crazy bees.cpp",
"name": "Crazy bees",
"note": "Bees flying Bresenham lines to a target, then picking a new one",
"ms": 16,
"params": []
},
{
"file": "Other/Fire.cpp",
"name": "Fire",
"note": "Perlin flame through the Heat palette",
"ms": 16,
"params": [
{
"k": "scale",
"label": "Scale",
"def": 64.0,
"min": 1.0,
"max": 255.0
},
{
"k": "speed",
"label": "Speed",
"def": 92.0,
"min": 1.0,
"max": 255.0
}
]
},
{
"file": "Other/Ghost Rider.cpp",
"name": "Ghost Rider",
"note": "A rider that turns, and sparks thrown off its trail",
"ms": 16,
"params": [
{
"k": "Speed",
"label": "Speed",
"def": 255.0,
"min": 0,
"max": 1020
},
{
"k": "reseting",
"label": "reseting",
"def": 10.0,
"min": 0,
"max": 40
}
]
},
{
"file": "Other/Gyroscope.cpp",
"name": "Gyroscope",
"note": "Six axes tumbling in 3D, drawn as gradient lines",
"ms": 16,
"params": []
},
{
"file": "Other/Lost lands.cpp",
"name": "Lost lands",
"note": "Cloud palette minus a noise mask",
"ms": 16,
"params": []
},
{
"file": "Other/Plasm ball.cpp",
"name": "Plasm ball",
"note": "Two noise fields folded into a cage",
"ms": 16,
"params": []
},
{
"file": "Other/Plasma_ball.cpp",
"name": "Plasma ball",
"note": "Arcs from the rim to the centre, aimed by 16-bit noise",
"ms": 16,
"params": []
},
{
"file": "Other/Racer.cpp",
"name": "Racer",
"note": "A racer pulled toward a target, which explodes into a shape when caught",
"ms": 16,
"params": [
{
"k": "straightLineDir",
"label": "straightLineDir",
"def": 1.0,
"min": 0,
"max": 4
},
{
"k": "FADE_KOEF",
"label": "FADE_KOEF",
"def": 0.5,
"min": 0,
"max": 2.0,
"step": 0.05
}
]
},
{
"file": "Other/SmokeWaves.cpp",
"name": "SmokeWaves",
"note": "Embers injected at the base, then shifted up",
"ms": 16,
"params": [
{
"k": "speed",
"label": "Speed",
"def": 255.0,
"min": 1.0,
"max": 255.0
},
{
"k": "scale",
"label": "Scale",
"def": 8.0,
"min": 1.0,
"max": 16.0
},
{
"k": "Clr",
"label": "Clr",
"def": 0.0,
"opts": [
"Off",
"On"
]
},
{
"k": "SubPix",
"label": "SubPix",
"def": 1.0,
"opts": [
"Off",
"On"
]
}
]
},
{
"file": "Other/Space Ships.cpp",
"name": "Space Ships",
"note": "Eight dots on a panel that scrolls, turning every five seconds",
"ms": 16,
"params": []
},
{
"file": "Other/Spider.cpp",
"name": "Spider",
"note": "Seven lines whose ends orbit, weaving a web",
"ms": 16,
"params": [
{
"k": "Speed",
"label": "Speed",
"def": 240.0,
"min": 0,
"max": 960
},
{
"k": "Koef",
"label": "Koef",
"def": 10.0,
"min": 0,
"max": 40
},
{
"k": "lines",
"label": "Lines",
"def": 7.0,
"min": 1.0,
"max": 16.0
},
{
"k": "Color",
"label": "Color",
"def": 1.0,
"opts": [
"Off",
"On"
]
},
{
"k": "Fader",
"label": "Fader",
"def": 64.0,
"min": 0,
"max": 256
}
]
},
{
"file": "Other/Starships(with smooth direction change).cpp",
"name": "Starships",
"note": "The same dots, but the panel slides sub-pixel in both axes",
"ms": 16,
"params": []
},
{
"file": "Other/Walking machine.cpp",
"name": "Walking machine",
"note": "Seven joints on slow beats, linked into a body",
"ms": 16,
"params": []
},
{
"file": "Other/Wandering souls.cpp",
"name": "Wandering souls",
"note": "Thirty lighters drifting on straight lines, wrapping at the edges",
"ms": 16,
"params": [
{
"k": "Speed",
"label": "Speed",
"def": 255.0,
"min": 0,
"max": 1020
},
{
"k": "Scale",
"label": "Scale",
"def": 8.0,
"min": 0,
"max": 32
},
{
"k": "Run",
"label": "Run",
"def": 2.0,
"min": 0,
"max": 8
},
{
"k": "lamp",
"label": "lamp",
"def": 0.0,
"opts": [
"Off",
"On"
]
},
{
"k": "trace",
"label": "trace",
"def": 1.0,
"min": 0,
"max": 4
},
{
"k": "reseting",
"label": "reseting",
"def": 10.0,
"min": 0,
"max": 40
},
{
"k": "subPixel",
"label": "subPixel",
"def": 1.0,
"opts": [
"Off",
"On"
]
},
{
"k": "broad",
"label": "broad",
"def": 0.0,
"opts": [
"Off",
"On"
]
}
]
},
{
"file": "Other/Wave.cpp",
"name": "Wave",
"note": "Noise bars, mirrored and blurred",
"ms": 16,
"params": []
},
{
"file": "Other/Wind.cpp",
"name": "Wind",
"note": "Noise-steered motes, wu-pixel trails",
"ms": 16,
"params": []
},
{
"file": "Particle System/Fire(particle system).cpp",
"name": "Fire (particles)",
"note": "The same particle rig, aimed upward and blurred hard",
"ms": 16,
"params": [
{
"k": "speed",
"label": "Speed",
"def": 255.0,
"min": 1.0,
"max": 255.0
},
{
"k": "SpeedDecY",
"label": "SpeedDecY",
"def": 0.0,
"min": 0,
"max": 1
}
]
},
{
"file": "Particle System/Jumping balls.cpp",
"name": "Jumping balls",
"note": "Balls that fall to the floor and bounce back up",
"ms": 16,
"params": [
{
"k": "Board",
"label": "Board",
"def": 1.0,
"opts": [
"Off",
"On"
]
},
{
"k": "FADE_KOEF",
"label": "FADE_KOEF",
"def": 10.0,
"min": 0,
"max": 40
},
{
"k": "SpeedDecY",
"label": "SpeedDecY",
"def": 0.0,
"min": 0,
"max": 1
}
]
},
{
"file": "Particle System/Lava(particle system).cpp",
"name": "Lava (particles)",
"note": "Particles spawned across the floor, pulled sideways by noise",
"ms": 16,
"params": [
{
"k": "FADE_KOEF",
"label": "FADE_KOEF",
"def": 1.2,
"min": 0,
"max": 4.8,
"step": 0.05
},
{
"k": "SpeedK",
"label": "SpeedK",
"def": 2.0,
"min": 0,
"max": 8
},
{
"k": "SpeedDecY",
"label": "SpeedDecY",
"def": 0.0,
"min": 0,
"max": 1
}
]
},
{
"file": "Particle System/Particle system.cpp",
"name": "Particle system",
"note": "Sparks falling into an attractor at the centre",
"ms": 16,
"params": [
{
"k": "FADE_KOEF",
"label": "FADE_KOEF",
"def": 1.0,
"min": 0,
"max": 4
}
]
},
{
"file": "Particle System/Wind(particle system).cpp",
"name": "Wind (particles)",
"note": "Motes blown in from the left edge, drifting with the noise",
"ms": 16,
"params": [
{
"k": "FADE_KOEF",
"label": "FADE_KOEF",
"def": 1.2,
"min": 0,
"max": 4.8,
"step": 0.05
},
{
"k": "SpeedK",
"label": "SpeedK",
"def": 2.0,
"min": 0,
"max": 8
},
{
"k": "SpeedDecY",
"label": "SpeedDecY",
"def": 0.0,
"min": 0,
"max": 1
}
]
},
{
"file": "Radial Effects/Flower.cpp",
"name": "Flower",
"note": "sin8 folded three deep",
"ms": 16,
"params": [
{
"k": "speed",
"label": "Speed",
"def": 1.0,
"min": 1.0,
"max": 16.0
}
]
},
{
"file": "Radial Effects/Hypnosis.cpp",
"name": "Hypnosis",
"note": "Striped palette pulled through a spiral",
"ms": 16,
"params": []
},
{
"file": "Radial Effects/Lotus.cpp",
"name": "Lotus",
"note": "Five petals from nested sin8",
"ms": 20,
"params": [
{
"k": "petals",
"label": "Petals",
"def": 5.0,
"min": 1.0,
"max": 16.0
},
{
"k": "speed",
"label": "Speed",
"def": 2.0,
"min": 1.0,
"max": 16.0
}
]
},
{
"file": "Radial Effects/Mariana Trench.cpp",
"name": "Mariana Trench",
"note": "Noise sampled along a sin8 radius",
"ms": 20,
"params": [
{
"k": "speed",
"label": "Speed",
"def": 8.0,
"min": 1.0,
"max": 32.0
}
]
},
{
"file": "Radial Effects/Octopus.cpp",
"name": "Octopus",
"note": "Three arms chasing the centre",
"ms": 16,
"params": [
{
"k": "legs",
"label": "Legs",
"def": 3.0,
"min": 1.0,
"max": 16.0
},
{
"k": "speed",
"label": "Speed",
"def": 3.0,
"min": 1.0,
"max": 16.0
}
]
},
{
"file": "Radial Effects/Odd lands.cpp",
"name": "Odd lands",
"note": "Polar noise pushed through the Forest palette",
"ms": 16,
"params": [
{
"k": "speed",
"label": "Speed",
"def": 1.0,
"min": 1.0,
"max": 16.0
}
]
},
{
"file": "Radial Effects/Radial Pattern.cpp",
"name": "Radial Pattern",
"note": "Red and green checkers in polar space, drifting apart",
"ms": 20,
"params": [
{
"k": "speed",
"label": "Speed",
"def": 2.0,
"min": 1.0,
"max": 16.0
}
]
},
{
"file": "Radial Effects/RadialFire.cpp",
"name": "RadialFire",
"note": "Fire.cpp rewritten in polar coordinates",
"ms": 20,
"params": [
{
"k": "scaleX",
"label": "Scale X",
"def": 16.0,
"min": 1.0,
"max": 64.0
},
{
"k": "scaleY",
"label": "Scale Y",
"def": 1.0,
"min": 1.0,
"max": 64.0
},
{
"k": "speed",
"label": "Speed",
"def": 24.0,
"min": 1.0,
"max": 64.0
}
]
},
{
"file": "Radial Effects/RadialNuclearNoise.cpp",
"name": "Radial Nuclear Noise",
"note": "Three noise fields thresholded into R, G and B",
"ms": 16,
"params": [
{
"k": "speed",
"label": "Speed",
"def": 8.0,
"min": 1.0,
"max": 32.0
}
]
},
{
"file": "Radial Effects/RadialWave.cpp",
"name": "Radial Wave",
"note": "One sin8 nested in another, by angle",
"ms": 16,
"params": [
{
"k": "speed",
"label": "Speed",
"def": 1.0,
"min": 1.0,
"max": 16.0
}
]
},
{
"file": "Radial Effects/Rainbow tunel.cpp",
"name": "Rainbow tunnel",
"note": "Hue by angle, brightness by radius",
"ms": 20,
"params": [
{
"k": "scaleX",
"label": "Scale X",
"def": 4.0,
"min": 1.0,
"max": 16.0
},
{
"k": "scaleY",
"label": "Scale Y",
"def": 4.0,
"min": 1.0,
"max": 16.0
},
{
"k": "speed",
"label": "Speed",
"def": 2.0,
"min": 1.0,
"max": 16.0
}
]
},
{
"file": "Testing stuff/2048.cpp",
"name": "2048",
"note": "The game playing itself with random swipes",
"ms": 160,
"params": []
},
{
"file": "Testing stuff/Alone in the void.cpp",
"name": "Alone in the void",
"note": "A noise cave, redrawn as the camera falls through it",
"ms": 16,
"params": [
{
"k": "scale",
"label": "Scale",
"def": 16.0,
"min": 1.0,
"max": 64.0
}
]
},
{
"file": "Testing stuff/BlackHole.cpp",
"name": "Black Hole",
"note": "32 orbiting dots, each on its own beat",
"ms": 16,
"params": []
},
{
"file": "Testing stuff/Candle.cpp",
"name": "Candle",
"note": "Four distance fields, one of them wandering",
"ms": 16,
"params": []
},
{
"file": "Testing stuff/Clouds.cpp",
"name": "Clouds",
"note": "Three-octave noise, inverted",
"ms": 16,
"params": []
},
{
"file": "Testing stuff/Color Frizzles.cpp",
"name": "Color Frizzles",
"note": "Eight beat-driven dots, blurred into ribbons",
"ms": 16,
"params": []
},
{
"file": "Testing stuff/CrazyBee.cpp",
"name": "Crazy Bee",
"note": "Noise walk with the contrast stretched, drawn as a trail",
"ms": 16,
"params": []
},
{
"file": "Testing stuff/Curve.cpp",
"name": "Curve",
"note": "A bezier whose control points each ride their own beat",
"ms": 16,
"params": [
{
"k": "subPix",
"label": "subPix",
"def": 0.0,
"opts": [
"Off",
"On"
]
}
]
},
{
"file": "Testing stuff/Dithering Test.cpp",
"name": "Dithering",
"note": "Floyd-Steinberg over noise, on eight colours",
"ms": 16,
"params": []
},
{
"file": "Testing stuff/GraphDrawing.cpp",
"name": "Graph",
"note": "A scrolling plot that rescales to its own min and max",
"ms": 16,
"params": [
{
"k": "MIN_BORDER",
"label": "MIN_BORDER",
"def": 0.0,
"min": 0,
"max": 1
}
]
},
{
"file": "Testing stuff/Lava lake.cpp",
"name": "Lava lake",
"note": "Noise sheared by x·y, on the Lava palette",
"ms": 16,
"params": []
},
{
"file": "Testing stuff/Lines.cpp",
"name": "Lines",
"note": "Twelve Bresenham lines chasing their endpoints",
"ms": 16,
"params": []
},
{
"file": "Testing stuff/Monster Face.cpp",
"name": "Monster Face",
"note": "A face drawn three times, one channel each, slightly out of step",
"ms": 16,
"params": []
},
{
"file": "Testing stuff/NoiseMove Test.cpp",
"name": "Noise Move",
"note": "Dots steered by raw signed noise, wrapping at the edges",
"ms": 16,
"params": []
},
{
"file": "Testing stuff/NoiseV2.cpp",
"name": "Noise V2",
"note": "Perlin plus two travelling ripple centres",
"ms": 16,
"params": []
},
{
"file": "Testing stuff/NoiseWithSettings.cpp",
"name": "Noise plus palette",
"note": "The FastLED noise demo, trimmed down",
"ms": 16,
"params": [
{
"k": "Speed",
"label": "Speed",
"def": 10.0,
"min": 0,
"max": 40
},
{
"k": "Scale",
"label": "Scale",
"def": 30.0,
"min": 0,
"max": 120
}
]
},
{
"file": "Testing stuff/PoolNoise.cpp",
"name": "Pool Noise",
"note": "A palette built at runtime, so the noise reads as water",
"ms": 16,
"params": [
{
"k": "Sat",
"label": "Sat",
"def": 255.0,
"min": 0,
"max": 1020
},
{
"k": "Hue",
"label": "Hue",
"def": 150.0,
"min": 0,
"max": 600
},
{
"k": "Scale",
"label": "Scale",
"def": 40.0,
"min": 0,
"max": 160
}
]
},
{
"file": "Testing stuff/Pseudo water in jar.cpp",
"name": "Water in a jar",
"note": "A one-dimensional spring chain, read as a water line",
"ms": 16,
"params": []
},
{
"file": "Testing stuff/Rotating rainbow Test.cpp",
"name": "Rotating rainbow",
"note": "A hue ramp whose gradient direction turns",
"ms": 16,
"params": []
},
{
"file": "Testing stuff/Sort methods.cpp",
"name": "Sorting",
"note": "Bubble, selection, insertion and merge sort, one swap pass per frame",
"ms": 10,
"params": []
},
{
"file": "Testing stuff/Special Camera Mode.cpp",
"name": "Camera Mode",
"note": "One dot, but the camera swings the whole panel around it",
"ms": 16,
"params": []
},
{
"file": "Testing stuff/Torch.cpp",
"name": "Torch",
"note": "A raycast light cone walking a randomly built map",
"ms": 16,
"params": [
{
"k": "HitPoints",
"label": "HitPoints",
"def": 0.0,
"min": 0,
"max": 1
},
{
"k": "Color",
"label": "Color",
"def": 40.0,
"min": 0,
"max": 160
},
{
"k": "POV",
"label": "POV",
"def": 75.0,
"min": 0,
"max": 300
},
{
"k": "povAngle",
"label": "povAngle",
"def": 1.0,
"min": 0,
"max": 4
}
]
},
{
"file": "Testing stuff/Ugly Caustic.cpp",
"name": "Ugly Caustic",
"note": "Noise used as a lens: light gathers where the gradient converges",
"ms": 16,
"params": [
{
"k": "scale",
"label": "Scale",
"def": 24.0,
"min": 1.0,
"max": 64.0
},
{
"k": "bri",
"label": "Brightness",
"def": 128.0,
"min": 1.0,
"max": 255.0
},
{
"k": "speed",
"label": "Speed",
"def": 8.0,
"min": 1.0,
"max": 64.0
}
]
},
{
"file": "Testing stuff/WavingCells.cpp",
"name": "Waving Cells",
"note": "Two sine grids beating against each other",
"ms": 16,
"params": []
},
{
"file": "Testing stuff/Worley Noise.cpp",
"name": "Worley Noise",
"note": "Cell edges from the 1st and 2nd nearest point, hued by cell",
"ms": 16,
"params": []
},
{
"file": "Testing stuff/Zooming Test.cpp",
"name": "Zooming",
"note": "The panel repeatedly zooms into a quarter of itself",
"ms": 200,
"params": [
{
"k": "zoomspeed",
"label": "zoomspeed",
"def": 128.0,
"min": 0,
"max": 512
}
]
},
{
"file": "Testing stuff/drawBars.cpp",
"name": "Bars",
"note": "One bar per column, each on its own beat, drawn sub-pixel",
"ms": 16,
"params": [
{
"k": "ROT",
"label": "ROT",
"def": 0.0,
"opts": [
"Off",
"On"
]
}
]
},
{
"file": "Testing stuff/spring cellular automata Test.cpp",
"name": "Spring cells",
"note": "Every LED is a mass on a spring, pulled by its neighbours",
"ms": 16,
"params": []
},
{
"file": "Updated existing Effects/Maze.cpp",
"name": "Maze",
"note": "A maze dug at random, then solved by keeping one hand on the wall",
"ms": 16,
"params": []
},
{
"file": "Updated existing Effects/Metaballs UPD.cpp",
"name": "Metaballs",
"note": "Stefan Petrick's isosurfaces, noise-driven",
"ms": 16,
"params": [
{
"k": "scale",
"label": "Scale",
"def": 160.0,
"min": 1.0,
"max": 255.0
},
{
"k": "speed",
"label": "Speed",
"def": 0.5,
"min": 0.05,
"max": 2.0,
"step": 0.05
}
]
},
{
"file": "Updated existing Effects/Patterns.cpp",
"name": "Patterns",
"note": "Thirty-eight woven patterns, scrolling diagonally",
"ms": 16,
"params": [
{
"k": "NEW_TIME",
"label": "NEW_TIME",
"def": 25.0,
"min": 0,
"max": 100
},
{
"k": "SubPix",
"label": "SubPix",
"def": 0.0,
"opts": [
"Off",
"On"
]
},
{
"k": "XSpeed",
"label": "XSpeed",
"def": 0.2,
"min": 0,
"max": 0.8,
"step": 0.05
},
{
"k": "YSpeed",
"label": "YSpeed",
"def": 0.1,
"min": 0,
"max": 0.4,
"step": 0.05
},
{
"k": "size",
"label": "size",
"def": 1.0,
"min": 0,
"max": 4
},
{
"k": "SHIFT_HUE",
"label": "SHIFT_HUE",
"def": 1.0,
"min": 0,
"max": 4
},
{
"k": "MAX_PATTERN",
"label": "MAX_PATTERN",
"def": 38.0,
"min": 0,
"max": 152
}
]
},
{
"file": "Updated existing Effects/Sending.cpp",
"name": "Sending",
"note": "Voxels handed from one edge of the panel to the other",
"ms": 16,
"params": [
{
"k": "regime",
"label": "regime",
"def": 1.0,
"opts": [
"Off",
"On"
]
},
{
"k": "speed",
"label": "Speed",
"def": 5.0,
"min": 1.0,
"max": 64.0
}
]
},
{
"file": "Updated existing Effects/Sinusoid Update.cpp",
"name": "Sinusoid",
"note": "Stefan Petrick's sinusoid: two ripple centres on a lissajous",
"ms": 16,
"params": [
{
"k": "regime",
"label": "Regime",
"def": 0.0,
"opts": [
"Sinusoid I",
"Sinusoid II",
"Sinusoid III",
"Sinusoid IV"
]
},
{
"k": "speed",
"label": "Speed",
"def": 30.0,
"min": 1.0,
"max": 255.0
},
{
"k": "scale",
"label": "Scale",
"def": 1.0,
"min": 1.0,
"max": 255.0
},
{
"k": "amplitude",
"label": "amplitude",
"def": 200.0,
"min": 0,
"max": 800
}
]
}
];
