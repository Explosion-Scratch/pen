// Intercepting HTMX requests for this proof-of-concept
document.body.addEventListener('htmx:beforeRequest', function(evt) {
    const path = evt.detail.pathInfo.requestPath;
    if (path === '/api/hello') {
        const xhr = evt.detail.xhr;
        // Mocking the response
        setTimeout(() => {
            const response = `
                <div style="color: #3366ff; font-weight: bold;">
                    Hello from HTMX! 🚀
                </div>
                <p style="font-size: 0.8rem; opacity: 0.6;">This was "fetched" using HTMX attributes.</p>
            `;
            // We tell HTMX to stop the real request and use our mock
            Object.defineProperty(xhr, 'readyState', { value: 4 });
            Object.defineProperty(xhr, 'status', { value: 200 });
            Object.defineProperty(xhr, 'responseText', { value: response });
            xhr.dispatchEvent(new Event('load'));
        }, 300);
        evt.preventDefault(); // Stop the real AJAX call
    }
});
