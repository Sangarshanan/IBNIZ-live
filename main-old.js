let ibnizConsole = null
let isPlaying = false

// Initialize the visualization when page loads
document.addEventListener('DOMContentLoaded', async () => {
    const canvas = document.getElementById('canvas')
    const codeEditor = document.getElementById('code-editor')
    const presets = document.getElementById('presets')
    const timeDisplay = document.getElementById('time')
    const fpsDisplay = document.getElementById('fps')

    // Resize canvas to fill viewport
    function resizeCanvas() {
        canvas.width = window.innerWidth
        canvas.height = window.innerHeight
        canvas.style.width = window.innerWidth + 'px'
        canvas.style.height = window.innerHeight + 'px'

        // Update IBNIZ console resolution if it exists
        if (ibnizConsole && ibnizConsole.resize) {
            ibnizConsole.resize()
        }
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    // Initialize console
    try {
        ibnizConsole = new jibniz.Console(canvas)
        console.log('IBNIZ Console created successfully')

        await ibnizConsole.init()
        console.log('IBNIZ Console initialized successfully')

        ibnizConsole.highQuality = false

        // Load initial program
        const initialCode = presets.value
        codeEditor.value = initialCode
        compileAndRun()

        // Start the visualization
        ibnizConsole.run()
        isPlaying = true
        console.log('IBNIZ visualization started')

    } catch (error) {
        console.error('Failed to initialize IBNIZ:', error)
        alert('Failed to initialize IBNIZ visualization. Please check the browser console for details.')
    }

    // Update display every frame
    function updateDisplay() {
        if (ibnizConsole) {
            timeDisplay.textContent = ibnizConsole.time.toString().padStart(4, '0')
            fpsDisplay.textContent = (ibnizConsole.fps || 0).toString().padStart(2, '0')
        }
        requestAnimationFrame(updateDisplay)
    }
    updateDisplay()

    // Preset selection handler
    presets.addEventListener('change', (e) => {
        codeEditor.value = e.target.value
        compileAndRun()
    })

    // Quality toggle handler
    const qualityToggle = document.getElementById('high-quality')
    qualityToggle.addEventListener('change', (e) => {
        if (ibnizConsole) {
            ibnizConsole.highQuality = e.target.checked
            // Force resolution recalculation
            if (ibnizConsole.resize) {
                ibnizConsole.resize()
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
    if (!ibnizConsole) return

    try {
        const code = document.getElementById('code-editor').value
        const program = new jibniz.Program(code)
        ibnizConsole.install(program)

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

function togglePlayback() {
    if (!ibnizConsole) return

    if (isPlaying) {
        ibnizConsole.pause()
        isPlaying = false
    } else {
        ibnizConsole.run()
        isPlaying = true
    }
}

function resetVisualization() {
    if (!ibnizConsole) return

    // Clear the code editor and set to "*"
    const codeEditor = document.getElementById('code-editor')
    codeEditor.value = '*'

    // Reset the visualization
    ibnizConsole.reset()

    // Compile and run the new code
    compileAndRun()

    // Restart if currently playing
    if (isPlaying) {
        ibnizConsole.run()
    }
}

function toggleEditor() {
    const editor = document.getElementById('floating-editor')
    editor.style.display = editor.style.display === 'none' ? 'block' : 'none'
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