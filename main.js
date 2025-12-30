// IBNIZ Live with Multiple Implementations

let currentConsole = null
let currentImplementation = 'original'
let isPlaying = false

// Initialize the visualization when page loads
document.addEventListener('DOMContentLoaded', async () => {
    const canvas = document.getElementById('canvas')
    const codeEditor = document.getElementById('code-editor')
    const presets = document.getElementById('presets')
    const implementationSelect = document.getElementById('implementation-select')
    const timeDisplay = document.getElementById('time')
    const fpsDisplay = document.getElementById('fps')

    // Resize canvas to fill viewport
    function resizeCanvas() {
        // Resize original canvas
        canvas.width = window.innerWidth
        canvas.height = window.innerHeight
        canvas.style.width = window.innerWidth + 'px'
        canvas.style.height = window.innerHeight + 'px'

        // Resize alternative canvas if it exists
        const altCanvas = document.getElementById('canvas-alt')
        if (altCanvas) {
            altCanvas.width = window.innerWidth
            altCanvas.height = window.innerHeight
            altCanvas.style.width = window.innerWidth + 'px'
            altCanvas.style.height = window.innerHeight + 'px'
        }

        // Update IBNIZ console resolution if it exists
        if (currentConsole && currentConsole.resize) {
            currentConsole.resize()
        }
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    // Create console based on implementation
    async function createConsole(implementation) {
        if (currentConsole) {
            currentConsole.pause()
        }

        // Hide existing canvas
        const existingCanvas = document.getElementById('canvas')
        if (existingCanvas) {
            existingCanvas.style.display = 'none'
        }

        try {
            let targetCanvas

            if (implementation === 'alternative') {
                // Create a new canvas for WebGL implementation
                let altCanvas = document.getElementById('canvas-alt')
                if (!altCanvas) {
                    altCanvas = document.createElement('canvas')
                    altCanvas.id = 'canvas-alt'
                    altCanvas.style.position = 'fixed'
                    altCanvas.style.top = '0'
                    altCanvas.style.left = '0'
                    altCanvas.style.width = '100vw'
                    altCanvas.style.height = '100vh'
                    altCanvas.style.zIndex = '1'
                    altCanvas.style.imageRendering = 'pixelated'
                    altCanvas.style.imageRendering = '-moz-crisp-edges'
                    altCanvas.style.imageRendering = 'crisp-edges'
                    document.body.appendChild(altCanvas)
                }
                altCanvas.style.display = 'block'
                altCanvas.width = window.innerWidth
                altCanvas.height = window.innerHeight
                targetCanvas = altCanvas

                currentConsole = new jibnizAlt.Console(targetCanvas)
                console.log('Alternative IBNIZ Console created')
            } else {
                // Use original canvas for original implementation
                existingCanvas.style.display = 'block'
                targetCanvas = existingCanvas

                currentConsole = new jibniz.Console(targetCanvas)
                console.log('Original IBNIZ Console created')
                currentConsole.highQuality = document.getElementById('high-quality').checked
            }

            await currentConsole.init()
            console.log(`${implementation} IBNIZ Console initialized successfully`)

            return currentConsole
        } catch (error) {
            console.error(`Failed to initialize ${implementation} IBNIZ:`, error)
            throw error
        }
    }

    // Initialize with default implementation
    try {
        await createConsole(currentImplementation)

        // Load initial program
        const initialCode = presets.value || '**' // Fallback to '**' if preset is empty
        console.log(`Initial code: "${initialCode}"`)
        codeEditor.value = initialCode
        compileAndRun()

        // Start the visualization
        currentConsole.run()
        isPlaying = true
        console.log('IBNIZ visualization started')

    } catch (error) {
        console.error('Failed to initialize IBNIZ:', error)
        alert('Failed to initialize IBNIZ visualization. Please check the browser console for details.')
    }

    // Update display every frame
    function updateDisplay() {
        if (currentConsole) {
            timeDisplay.textContent = currentConsole.time.toString(16).padStart(4, '0').toUpperCase()
            fpsDisplay.textContent = (currentConsole.fps || 0).toString().padStart(2, '0')
        }
        requestAnimationFrame(updateDisplay)
    }
    updateDisplay()

    // Implementation selection handler
    implementationSelect.addEventListener('change', async (e) => {
        const newImplementation = e.target.value
        const wasPlaying = isPlaying

        try {
            console.log(`Switching to ${newImplementation} implementation...`)
            currentImplementation = newImplementation
            await createConsole(newImplementation)

            // Compile and install the current code immediately
            compileAndRun()

            // Start the console if it was playing before
            if (wasPlaying) {
                currentConsole.run()
                isPlaying = true
                console.log('Resumed playback after switch')
            } else {
                // Even if not playing, do one step to show the frame
                if (currentConsole.step) {
                    console.log('Implementation switch: Rendering single frame (paused state)')
                    currentConsole.step()
                }
                isPlaying = false
                console.log('Paused state maintained after switch')
            }

            console.log(`Successfully switched to ${newImplementation} implementation`)
        } catch (error) {
            console.error(`Failed to switch to ${newImplementation}:`, error)
            alert(`Failed to switch to ${newImplementation} implementation`)
            // Revert selection
            implementationSelect.value = currentImplementation
        }
    })

    // Preset selection handler
    presets.addEventListener('change', (e) => {
        codeEditor.value = e.target.value
        compileAndRun()
    })

    // Quality toggle handler (only for original implementation)
    const qualityToggle = document.getElementById('high-quality')
    qualityToggle.addEventListener('change', (e) => {
        if (currentConsole && currentConsole.highQuality !== undefined) {
            currentConsole.highQuality = e.target.checked
            // Force resolution recalculation
            if (currentConsole.resize) {
                currentConsole.resize()
            }
        }
    })

    // Hide/show editor functionality
    const hideEditorBtn = document.getElementById('hide-editor')
    const showEditorBtn = document.getElementById('show-editor')
    const floatingEditor = document.getElementById('floating-editor')

    hideEditorBtn.addEventListener('click', () => {
        floatingEditor.style.display = 'none'
        showEditorBtn.style.display = 'block'
    })

    showEditorBtn.addEventListener('click', () => {
        floatingEditor.style.display = 'block'
        showEditorBtn.style.display = 'none'
    })

    // Code editor auto-compile on input
    let compileTimeout
    codeEditor.addEventListener('input', () => {
        clearTimeout(compileTimeout)
        compileTimeout = setTimeout(compileAndRun, 500) // Auto-compile after 500ms pause
    })

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Space to toggle playback
        if (e.code === 'Space' && e.target !== codeEditor) {
            e.preventDefault()
            togglePlayback()
        }

        // Escape to toggle editor
        if (e.key === 'Escape') {
            e.preventDefault()
            toggleEditor()
        }

        // R to reset to "*"
        if (e.key === 'r' && e.target !== codeEditor) {
            e.preventDefault()
            resetVisualization()
        }
    })
})

function compileAndRun() {
    if (!currentConsole) {
        console.log('compileAndRun: No current console')
        return
    }

    try {
        const code = document.getElementById('code-editor').value
        console.log(`compileAndRun: Compiling code for ${currentImplementation}: "${code}"`)

        let program
        if (currentImplementation === 'alternative') {
            program = new jibnizAlt.Program(code)
        } else {
            program = new jibniz.Program(code)
        }

        console.log('compileAndRun: Program created:', program)
        currentConsole.install(program)
        console.log('compileAndRun: Program installed successfully')

        // Always render at least one frame to show the result, even if paused
        refreshCanvas()

        // Show success feedback briefly
        const editor = document.getElementById('code-editor')
        const originalBorder = editor.style.borderColor
        editor.style.borderColor = '#4ecdc4'
        setTimeout(() => {
            editor.style.borderColor = originalBorder
        }, 200)

    } catch (error) {
        console.error('Compilation error:', error)

        // Show error feedback
        const editor = document.getElementById('code-editor')
        const originalBorder = editor.style.borderColor
        editor.style.borderColor = '#ff6b6b'
        setTimeout(() => {
            editor.style.borderColor = originalBorder
        }, 1000)
    }
}

function refreshCanvas() {
    if (!currentConsole) return

    if (!isPlaying && currentConsole.step) {
        console.log('refreshCanvas: Rendering single frame')
        currentConsole.step()
    }
    // If playing, it will refresh automatically via the animation loop
}

function togglePlayback() {
    if (!currentConsole) return

    if (isPlaying) {
        currentConsole.pause()
        isPlaying = false
    } else {
        currentConsole.run()
        isPlaying = true
    }
}

function resetVisualization() {
    if (!currentConsole) return

    // Clear the code editor and set to "**" (default pattern)
    const codeEditor = document.getElementById('code-editor')
    codeEditor.value = '**'

    // Reset the visualization
    currentConsole.reset()

    // Compile and run the new code
    compileAndRun()

    // Restart if currently playing
    if (isPlaying) {
        currentConsole.run()
    }
}

function toggleEditor() {
    const editor = document.getElementById('floating-editor')
    const showBtn = document.getElementById('show-editor')

    if (editor.style.display === 'none') {
        editor.style.display = 'block'
        showBtn.style.display = 'none'
    } else {
        editor.style.display = 'none'
        showBtn.style.display = 'block'
    }
}

// Add some nice touches for better UX
document.addEventListener('DOMContentLoaded', () => {
    // Add hover effects to buttons
    const buttons = document.querySelectorAll('button')
    buttons.forEach(button => {
        button.addEventListener('mousedown', () => {
            button.style.transform = 'scale(0.95)'
        })

        button.addEventListener('mouseup', () => {
            button.style.transform = 'scale(1)'
        })

        button.addEventListener('mouseleave', () => {
            button.style.transform = 'scale(1)'
        })
    })

    // Add syntax highlighting hints (simple version)
    const codeEditor = document.getElementById('code-editor')
    let syntaxTimeout

    codeEditor.addEventListener('input', () => {
        clearTimeout(syntaxTimeout)
        syntaxTimeout = setTimeout(() => {
            // Simple validation - check for common IBNIZ patterns
            const code = codeEditor.value
            const hasValidChars = /^[0-9A-Fa-f+\-*/%&|^~=<>(){}[\]LijJRPUTwsaqpxvd.,$\s\\!@#]*$/.test(code)

            if (!hasValidChars) {
                codeEditor.style.boxShadow = '0 0 5px rgba(255, 68, 68, 0.5)'
            } else {
                codeEditor.style.boxShadow = 'none'
            }
        }, 100)
    })
})

// Help modal functionality
document.addEventListener('DOMContentLoaded', () => {
    const helpBtn = document.getElementById('help-btn')
    const helpModal = document.getElementById('help-modal')
    const modalClose = document.getElementById('modal-close')

    // Open modal
    helpBtn.addEventListener('click', () => {
        helpModal.classList.add('show')
    })

    // Close modal when clicking close button
    modalClose.addEventListener('click', () => {
        helpModal.classList.remove('show')
    })

    // Close modal when clicking overlay
    helpModal.addEventListener('click', (e) => {
        if (e.target === helpModal) {
            helpModal.classList.remove('show')
        }
    })

    // Close modal with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && helpModal.classList.contains('show')) {
            e.preventDefault()
            e.stopPropagation()
            helpModal.classList.remove('show')
        }
    })
})

// Export functions for global access
window.compileAndRun = compileAndRun
window.togglePlayback = togglePlayback
window.resetVisualization = resetVisualization
window.toggleEditor = toggleEditor