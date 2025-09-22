'use client'

import { useEffect, useRef } from 'react'

export const useAppKitScrollLock = () => {
  const isModalOpen = useRef(false)

  useEffect(() => {
    // Function to disable scroll
    const disableScroll = () => {
      document.body.style.overflow = 'hidden'
      document.body.classList.add('w3m-modal-open')
      isModalOpen.current = true
    }

    // Function to enable scroll
    const enableScroll = () => {
      document.body.style.overflow = 'unset'
      document.body.classList.remove('w3m-modal-open')
      isModalOpen.current = false
    }

    // Listen for AppKit modal state changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          // Check if AppKit modal is present - be more specific
          const hasModal = document.querySelector('w3m-modal[open]') || 
                          document.querySelector('[data-w3m-modal][open]') || 
                          document.querySelector('.w3m-modal[open]') ||
                          document.querySelector('w3m-modal:not([style*="display: none"])') ||
                          document.querySelector('[data-w3m-modal]:not([style*="display: none"])')
          
          console.log('Modal check:', { 
            hasModal: !!hasModal, 
            isModalOpen: isModalOpen.current,
            modalElements: {
              w3mModal: !!document.querySelector('w3m-modal'),
              dataW3mModal: !!document.querySelector('[data-w3m-modal]'),
              w3mModalClass: !!document.querySelector('.w3m-modal')
            }
          })
          
          if (hasModal && !isModalOpen.current) {
            console.log('Disabling scroll - modal detected')
            disableScroll()
          } else if (!hasModal && isModalOpen.current) {
            console.log('Enabling scroll - no modal detected')
            enableScroll()
          }
        }
      })
    })

    // Start observing
    observer.observe(document.body, {
      childList: true,
      subtree: true
    })

    // Cleanup
    return () => {
      observer.disconnect()
      enableScroll()
    }
  }, [])
}
