import logger from "./logger";
import { debounce } from "./debounce";

class cacheEntry {
    data: any;
    expires: number;
    ttl: number;

    constructor(data: any, ttl: number) {
        this.data = data;
        // Use Date.now() for calculations, store expiration timestamp
        this.expires = Date.now() + ttl;
        this.ttl = ttl; // Store original TTL if needed, though expires is used for checks
    }

    isExpired(): boolean {
        return Date.now() > this.expires;
    }
}

// Define an interface for the constructor options for better type safety
interface HoverActionOptions {
    element: HTMLElement;
    action: (options: { signal: AbortSignal }, reportProgress: (progress: any) => void) => Promise<any>;
    eventNamePrefix?: string;
    onResult?: ((result: any) => void) | null;
    onClick?: ((result: any, event: Event) => void) | null;
    onProgress?: ((progress: any) => void) | null;
    loadingClass?: string | null;
    executeOnlyOnce?: boolean;
    triggerMode?: 'delay' | 'debounce';
    hoverDelay?: number;
    hoverCancelDelay?: number; // Note: This property is not actively used in the provided logic to delay cancellation
    supportFocus?: boolean;
    focusDelay?: number;
    supportTouch?: boolean;
    touchDelay?: number;
    touchMoveThreshold?: number;
    abortOnLeave?: boolean;
    abortOnBlur?: boolean;
    cacheTTL?: number | null;
}


class hoverAction {
    static HOVER_ACTION_INITIALIZED_ATTR = 'data-hoveraction-initialized';

    // === Core Properties (Initialized based on options) ===
    // Definite assignment assertion (!) used because these are validated early in constructor
    // and essential for an initialized instance.
    element!: HTMLElement;
    action!: (options: { signal: AbortSignal }, reportProgress: (progress: any) => void) => Promise<any>;

    // Properties with defaults, potentially overridden by options
    eventNamePrefix: string;
    isInitialized: boolean = false; // Start as false, set to true on successful init
    onResult: ((result: any) => void) | null = null;
    onClick: ((result: any, event: Event) => void) | null = null;
    onProgress: ((progress: any) => void) | null = null;
    loadingClass: string | null = null;
    executeOnlyOnce: boolean = false;
    triggerMode: 'delay' | 'debounce' = 'delay';
    hoverDelay: number = 150;
    hoverCancelDelay: number = 100; // Assigned but not actively used in delays
    supportFocus: boolean = true;
    focusDelay: number; // Initialized based on hoverDelay later
    supportTouch: boolean = true;
    touchDelay: number = 300;
    touchMoveThreshold: number = 10;
    abortOnLeave: boolean = true;
    abortOnBlur: boolean; // Initialized based on abortOnLeave later
    cacheTTL: number | null = null;

    // === Internal State ===
    hoverTimer: ReturnType<typeof setTimeout> | null = null;
    focusTimer: ReturnType<typeof setTimeout> | null = null;
    touchTimer: ReturnType<typeof setTimeout> | null = null;
    touchStartX: number | null = null;
    touchStartY: number | null = null;
    actionPromise: Promise<any> | null = null;
    actionResult: any = undefined; // Use undefined to distinguish from null results
    actionExecuted: boolean = false;
    isLoading: boolean = false;
    abortController: AbortController | null = null;
    cacheEntry: cacheEntry | null = null;
    isTouchDevice: boolean = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
    // Type depends on the debounce implementation. Assuming it returns function + methods.
    debouncedExecuteAction: (() => void) & { cancel?: () => void; flush?: () => void } | null = null;


    constructor(options: HoverActionOptions) {
        // Assign eventNamePrefix early for logging during init
        this.eventNamePrefix = options.eventNamePrefix || 'hoveraction';

        // --- Start Guard Clauses ---
        if (!options.element) {
            logger.error(`[${this.eventNamePrefix}]`, 'No target element provided during construction.');
            // isInitialized remains false, other properties are left with initial defaults
            // Need to initialize properties dependent on others here to satisfy TS if we returned early
            this.focusDelay = this.hoverDelay; // Initialize dependent defaults even on error path
            this.abortOnBlur = this.abortOnLeave;
            return;
        }
        // Assign element now that we know it exists
        this.element = options.element;

        if (this.element.hasAttribute(hoverAction.HOVER_ACTION_INITIALIZED_ATTR)) {
            logger.warn(`[${this.eventNamePrefix}]`, 'hoverAction already initialized on this element.', this.element);
            this.focusDelay = this.hoverDelay; // Initialize dependent defaults
            this.abortOnBlur = this.abortOnLeave;
            return;
        }

        if (!options.action || typeof options.action !== 'function') {
            logger.error(`[${this.eventNamePrefix}]`, 'No valid action function provided.');
            this.focusDelay = this.hoverDelay; // Initialize dependent defaults
            this.abortOnBlur = this.abortOnLeave;
            return;
        }
        // --- End Guard Clauses ---

        // --- Initialization successful, assign all properties ---
        this.isInitialized = true; // Mark as initialized
        this.action = options.action;

        // Assign properties from options, using nullish coalescing (??) for defaults
        this.onResult = options.onResult ?? null;
        this.onClick = options.onClick ?? null;
        this.onProgress = options.onProgress ?? null;
        this.loadingClass = options.loadingClass ?? null;
        this.executeOnlyOnce = options.executeOnlyOnce ?? false;
        this.triggerMode = options.triggerMode ?? 'delay';
        this.hoverDelay = options.hoverDelay ?? 150;
        this.hoverCancelDelay = options.hoverCancelDelay ?? 100;
        this.supportFocus = options.supportFocus ?? true;
        // Initialize focusDelay based on hoverDelay if not explicitly provided
        this.focusDelay = options.focusDelay ?? this.hoverDelay;
        this.supportTouch = options.supportTouch ?? true;
        this.touchDelay = options.touchDelay ?? 300;
        this.touchMoveThreshold = options.touchMoveThreshold ?? 10;
        this.abortOnLeave = options.abortOnLeave ?? true;
        // Initialize abortOnBlur based on abortOnLeave if not explicitly provided
        this.abortOnBlur = options.abortOnBlur ?? this.abortOnLeave;
        this.cacheTTL = options.cacheTTL ?? null;

        // Bind methods to ensure `this` context is correct
        this.handleMouseEnter = this.handleMouseEnter.bind(this);
        this.handleMouseLeave = this.handleMouseLeave.bind(this);
        this.handleFocus = this.handleFocus.bind(this);
        this.handleBlur = this.handleBlur.bind(this);
        this.handleClick = this.handleClick.bind(this);
        this.handleTouchStart = this.handleTouchStart.bind(this);
        this.handleTouchEnd = this.handleTouchEnd.bind(this);
        this.handleTouchMove = this.handleTouchMove.bind(this);

        // Call init to set up listeners and debounce (if needed)
        this.init();
    }

    // Manually trigger the action
    execute(): Promise<any> {
        if (!this.isInitialized) {
            return Promise.reject(new Error(`[${this.eventNamePrefix}] hoverAction not initialized.`));
        }
        // Check cache before executing, similar to executeAction's internal check
        if (this.cacheEntry && !this.cacheEntry.isExpired()) {
            
            logger.debug(`[${this.eventNamePrefix}]`, 'execute() called, returning cached result.');
            if (this.onResult) this.onResult(this.cacheEntry.data); // Call onResult for consistency
            return Promise.resolve(this.cacheEntry.data);
        }
        if (this.executeOnlyOnce && this.actionExecuted && !this.cacheEntry) {
            
            logger.debug(`[${this.eventNamePrefix}]`, 'execute() called, returning previous non-cached result (executeOnlyOnce).');
            if (this.onResult) this.onResult(this.actionResult); // Call onResult for consistency
            return Promise.resolve(this.actionResult);
        }
        return this.executeAction();
    }

    // Reset internal state
    reset(clearCache = true): void {
        if (!this.isInitialized) return;

        
        logger.debug(`[${this.eventNamePrefix}]`, 'Resetting state', clearCache ? 'with cache cleared.' : ', cache preserved.');

        this.actionExecuted = false;
        if (clearCache) {
            this.actionResult = undefined; // Reset to initial value
            this.cacheEntry = null;
            
            logger.debug(`[${this.eventNamePrefix}]`, 'Cache cleared on reset.');
        }
        // Don't clear actionPromise here, abortAction handles ongoing promises.

        this.abortAction('reset'); // Abort any ongoing action
        this.setLoading(false); // Ensure loading state is reset
        this.clearTimers(); // Clear pending triggers
        // FIX: Explicitly check if cancel method exists before calling
        if (this.debouncedExecuteAction && typeof this.debouncedExecuteAction.cancel === 'function') {
            this.debouncedExecuteAction.cancel(); // Cancel pending debounced trigger
        }
    }

        // Clean up listeners and state
    destroy(): void {
        if (!this.isInitialized) return;
        
        this.abortAction('destroy'); // Abort any ongoing action

        // Remove event listeners safely using optional chaining
        this.element?.removeEventListener('mouseenter', this.handleMouseEnter);
        this.element?.removeEventListener('mouseleave', this.handleMouseLeave);
        this.element?.removeEventListener('click', this.handleClick);
        if (this.supportFocus) {
            this.element?.removeEventListener('focus', this.handleFocus);
            this.element?.removeEventListener('blur', this.handleBlur);
        }
        if (this.supportTouch && this.isTouchDevice) {
            this.element?.removeEventListener('touchstart', this.handleTouchStart);
            this.element?.removeEventListener('touchend', this.handleTouchEnd);
            this.element?.removeEventListener('touchcancel', this.handleTouchEnd);
            this.element?.removeEventListener('touchmove', this.handleTouchMove);
        }

        // Clean up element attributes
        this.element?.removeAttribute(hoverAction.HOVER_ACTION_INITIALIZED_ATTR);
        if (this.loadingClass) this.element?.classList.remove(this.loadingClass);
        this.element?.removeAttribute('aria-busy');

        // Clear timers and pending actions
        this.clearTimers();
        // FIX: Explicitly check if cancel method exists before calling
        if (this.debouncedExecuteAction && typeof this.debouncedExecuteAction.cancel === 'function') {
            this.debouncedExecuteAction.cancel();
        }

        // Reset internal state variables
        this.actionPromise = null;
        this.actionResult = undefined;
        this.cacheEntry = null;
        this.isLoading = false;
        this.actionExecuted = false;
        this.abortController = null;
        this.touchStartX = null;
        this.touchStartY = null;

        this.isInitialized = false; // Mark as uninitialized *last*
    }

    // Set up listeners and debounce
    private init(): void {
        // isInitialized is guaranteed true here because init is called at the end of constructor after checks
        this.element.setAttribute(hoverAction.HOVER_ACTION_INITIALIZED_ATTR, 'true');

        if (this.triggerMode === 'debounce') {
            let delay = this.hoverDelay;
            if (this.supportFocus) {
                delay = Math.max(delay, this.focusDelay);
            }

            // FIX: Remove the third argument (options object) if the imported
            // debounce function only accepts (func, delay).
            // If your debounce function *does* support options, keep it.
            this.debouncedExecuteAction = debounce(
                this.executeAction.bind(this),
                delay
                // { trailing: true, leading: false } // Example options object - uncomment/adjust if supported
            );
            
            logger.debug(`[${this.eventNamePrefix}]`, `Debounce mode enabled with delay ${delay}ms`);
        }

        // Add event listeners
        this.element.addEventListener('mouseenter', this.handleMouseEnter);
        this.element.addEventListener('mouseleave', this.handleMouseLeave);
        this.element.addEventListener('click', this.handleClick);
        if (this.supportFocus) {
            this.element.addEventListener('focus', this.handleFocus);
            this.element.addEventListener('blur', this.handleBlur);
        }
        if (this.supportTouch && this.isTouchDevice) {
            // Use passive: true where appropriate for performance
            this.element.addEventListener('touchstart', this.handleTouchStart, { passive: true });
            this.element.addEventListener('touchend', this.handleTouchEnd);
            this.element.addEventListener('touchcancel', this.handleTouchEnd);
            this.element.addEventListener('touchmove', this.handleTouchMove, { passive: true });
            
            logger.debug(`[${this.eventNamePrefix}]`, 'Touch support enabled');
        }
    }

    // --- Event Handlers ---
    private handleMouseEnter(e: MouseEvent): void {
        if (!this.isInitialized || this.isTouchDevice) return; // Avoid ghost mouse events on touch
        
        logger.debug(`[${this.eventNamePrefix}]`, 'Mouse enter');
        this.initiateActionTrigger('hover');
    }

    private handleMouseLeave(e: MouseEvent): void {
        if (!this.isInitialized) return;
        
        logger.debug(`[${this.eventNamePrefix}]`, 'Mouse leave');
        this.cancelActionTrigger('hover');
        if (this.abortOnLeave && this.isLoading) {
            
            logger.debug(`[${this.eventNamePrefix}]`, 'Aborting action due to mouseleave');
            this.abortAction('mouseleave');
        }
    }

    private handleFocus(e: FocusEvent): void {
        if (!this.isInitialized) return;
        
        logger.debug(`[${this.eventNamePrefix}]`, 'Focus gained');
        this.initiateActionTrigger('focus');
    }

    private handleBlur(e: FocusEvent): void {
        if (!this.isInitialized) return;
        
        logger.debug(`[${this.eventNamePrefix}]`, 'Focus lost');
        this.cancelActionTrigger('focus');

        // Check if focus moved outside the element before aborting
        const relatedTarget = e.relatedTarget as Element | null;
        if (!this.element.contains(relatedTarget)) {
            if (this.abortOnBlur && this.isLoading) {
                
                logger.debug(`[${this.eventNamePrefix}]`, 'Aborting action due to blur');
                this.abortAction('blur');
            }
        } else {
            
            logger.debug(`[${this.eventNamePrefix}]`, 'Blur ignored, focus moved within element.');
        }
    }

    private handleClick(e: MouseEvent): void {
        if (!this.isInitialized) return;
        
        logger.debug(`[${this.eventNamePrefix}]`, 'Click detected');

        this.clearTimers(); // Cancel any pending delayed actions

        // If debouncing, flush any pending action immediately on click
        if (this.triggerMode === 'debounce' && this.debouncedExecuteAction?.flush) {
            
            logger.debug(`[${this.eventNamePrefix}]`, 'Flushing debounced action on click.');
            this.debouncedExecuteAction.flush();
            // After flushing, the action might now be running or completed. The logic below handles it.
        }

        // Handle click based on current state
        if (this.isLoading && this.actionPromise) {
            // Action is currently running, wait for it to finish then call onClick
            
            logger.debug(`[${this.eventNamePrefix}]`, 'Click occurred while loading, awaiting result for onClick.');
            this.actionPromise
                .then(result => this.handleClickWithResult(result, e))
                .catch(err => {
                    // Avoid calling onClick if action was aborted, unless desired
                    if (!(err instanceof DOMException && err.name === 'AbortError')) {
                        
                        (logger.warn as any)(`[${this.eventNamePrefix}]`, 'Action failed before onClick call.', err);
                        this.handleClickWithResult(undefined, e); // Call with undefined on error
                    } else {
                        
                        logger.debug(`[${this.eventNamePrefix}]`, 'Action aborted, onClick skipped.');
                    }
                });
        } else if (this.actionExecuted) {
            // Action previously completed, use cached or previous result
            let resultToUse: any = undefined;
            let source: string = 'unknown';

            if (this.cacheEntry && !this.cacheEntry.isExpired()) {
                resultToUse = this.cacheEntry.data;
                source = 'valid cache';
                
                logger.debug(`[${this.eventNamePrefix}]`, `Click using ${source}.`);
                this.handleClickWithResult(resultToUse, e);
            } else if (this.cacheEntry && this.cacheEntry.isExpired()) {
                source = 'expired cache';
                
                logger.debug(`[${this.eventNamePrefix}]`, `Click with ${source}, re-executing action.`);
                this.executeAction() // Re-execute on click if cache expired
                    .then(result => this.handleClickWithResult(result, e))
                    .catch(err => {
                        if (!(err instanceof DOMException && err.name === 'AbortError')) {
                            
                            (logger.warn as any)(`[${this.eventNamePrefix}]`, 'Re-executed action failed.', err);
                            this.handleClickWithResult(undefined, e);
                        }
                    });
            } else { // No cache involved (cacheTTL is null) or executeOnlyOnce finished
                resultToUse = this.actionResult;
                source = 'previous result (no cache or executeOnlyOnce)';
                
                logger.debug(`[${this.eventNamePrefix}]`, `Click using ${source}.`);
                this.handleClickWithResult(resultToUse, e);
            }
        } else {
            // Action has not been triggered yet, execute it now on click
            
            logger.debug(`[${this.eventNamePrefix}]`, 'Action not yet run, executing on click.');
            this.executeAction()
                .then(result => this.handleClickWithResult(result, e))
                .catch(err => {
                    if (!(err instanceof DOMException && err.name === 'AbortError')) {
                        
                        (logger.warn as any)(`[${this.eventNamePrefix}]`, 'Action triggered by click failed.', err);
                        this.handleClickWithResult(undefined, e);
                    }
                });
        }
    }

    private handleTouchStart(e: TouchEvent): void {
        if (!this.isInitialized || !this.supportTouch) return;

        // Cancel any pending hover/focus triggers
        this.clearHoverTimer();
        this.clearFocusTimer();
        // FIX: Explicitly check if cancel method exists before calling
        if (this.debouncedExecuteAction && typeof this.debouncedExecuteAction.cancel === 'function') {
            this.debouncedExecuteAction.cancel();
        }

        if (e.touches.length === 1) { // React only to single touch for predictable behavior
            this.touchStartX = e.touches[0].clientX;
            this.touchStartY = e.touches[0].clientY;

            if (this.shouldExecute()) {
                
                logger.debug(`[${this.eventNamePrefix}]`, `Touch start, setting timer for ${this.touchDelay}ms`);
                this.touchTimer = setTimeout(() => {
                    
                    logger.debug(`[${this.eventNamePrefix}]`, 'Touch timer expired.');
                    // Check if touch hasn't been cancelled (e.g., by move)
                    if (this.touchStartX !== null) {
                        
                        logger.debug(`[${this.eventNamePrefix}]`, 'Executing action from touch timer.');
                        this.executeAction();
                    } else {
                        
                        logger.debug(`[${this.eventNamePrefix}]`, 'Touch timer expired, but touch already cancelled.');
                    }
                    this.touchTimer = null; // Timer fulfilled or irrelevant
                }, this.touchDelay);
            } else {
                
                logger.debug(`[${this.eventNamePrefix}]`, 'Touch start, shouldExecute returned false.');
                // If cached, could potentially call onClick here or wait for touchend/click
            }
        } else {
            // Multi-touch detected, cancel any pending touch timer
            
            logger.debug(`[${this.eventNamePrefix}]`, 'Multi-touch start, cancelling timer and ignoring.');
            this.clearTouchTimer();
            this.touchStartX = null; // Reset touch tracking
            this.touchStartY = null;
        }
    }

    private handleTouchEnd(e: TouchEvent): void {
        if (!this.isInitialized || !this.supportTouch) return;
        
        logger.debug(`[${this.eventNamePrefix}]`, 'Touch end/cancel.');
        this.clearTouchTimer(); // Clear timer if touch ends before firing

        // Reset touch start coordinates
        this.touchStartX = null;
        this.touchStartY = null;

        // Note: A 'click' event is often synthesized by the browser after touchend.
        // Rely on the handleClick handler to manage the final action/callback logic.
    }

    private handleTouchMove(e: TouchEvent): void {
        if (!this.isInitialized || !this.supportTouch || this.touchTimer === null) {
            // Only process move if a touch timer is active
            return;
        }

        if (this.touchStartX !== null && this.touchStartY !== null && e.touches.length > 0) {
            const dx = e.touches[0].clientX - this.touchStartX;
            const dy = e.touches[0].clientY - this.touchStartY;
            if (Math.sqrt(dx * dx + dy * dy) > this.touchMoveThreshold) {
                
                logger.debug(`[${this.eventNamePrefix}]`, 'Touch move exceeded threshold, cancelling timer.');
                this.clearTouchTimer();
                // Reset coordinates as the touch hold is broken
                this.touchStartX = null;
                this.touchStartY = null;
            }
        }
    }

    // --- Action Triggering ---
    private initiateActionTrigger(type: 'hover' | 'focus'): void {
        const delay = type === 'focus' ? this.focusDelay : this.hoverDelay;
        
        logger.debug(`[${this.eventNamePrefix}]`, `Initiating trigger: ${type}, delay: ${delay}ms`);

        // Cancel timers for other interaction types
        if (type === 'hover') this.clearFocusTimer();
        if (type === 'focus') this.clearHoverTimer();
        // Do not clear touch timer from hover/focus events

        if (!this.shouldExecute()) {
            
            logger.debug(`[${this.eventNamePrefix}]`, 'Trigger skipped (shouldExecute is false).');
            // If there's a valid result already (cached or from executeOnlyOnce),
            // call onResult immediately to provide feedback.
            const result = this.getCachedOrExecutedResult();
            if (result !== undefined && this.onResult) {
                
                logger.debug(`[${this.eventNamePrefix}]`, 'Calling onResult immediately with existing data.');
                try { this.onResult(result.data); } catch (err) { logger.error(`Error in onResult`, err); }
            }
            return;
        }

        if (this.triggerMode === 'debounce') {
            
            logger.debug(`[${this.eventNamePrefix}]`, 'Calling debounced executeAction.');
            // Check debouncedExecuteAction exists before calling
            if (this.debouncedExecuteAction) {
                this.debouncedExecuteAction();
            }
        } else { // 'delay' mode
            // Clear existing timer *of the same type* before setting a new one
            if (type === 'hover') this.clearHoverTimer();
            if (type === 'focus') this.clearFocusTimer();

            
            logger.debug(`[${this.eventNamePrefix}]`, `Setting ${type} timer.`);
            const timerId = setTimeout(() => {
                
                logger.debug(`[${this.eventNamePrefix}]`, `${type} timer expired, executing action.`);
                this.executeAction();
                // Clear the timer variable once it has executed its action
                if (type === 'focus') this.focusTimer = null;
                if (type === 'hover') this.hoverTimer = null;
            }, delay);

            // Store the new timer ID
            if (type === 'focus') this.focusTimer = timerId;
            if (type === 'hover') this.hoverTimer = timerId;
        }
    }

    private cancelActionTrigger(type: 'hover' | 'focus'): void {
        
        logger.debug(`[${this.eventNamePrefix}]`, `Cancelling trigger: ${type}`);
        if (this.triggerMode === 'debounce') {
            
            logger.debug(`[${this.eventNamePrefix}]`, 'Cancelling debounced action.');
            // FIX: Explicitly check if cancel method exists before calling
            if (this.debouncedExecuteAction && typeof this.debouncedExecuteAction.cancel === 'function') {
                this.debouncedExecuteAction.cancel();
            }
        } else {
            // Clear the specific timer
            if (type === 'hover') this.clearHoverTimer();
            if (type === 'focus') this.clearFocusTimer();
        }
        // Do not clear touch timer here
    }

    // --- Timer Management ---
    private clearTimers(): void {
        this.clearHoverTimer();
        this.clearFocusTimer();
        this.clearTouchTimer();
    }

    private clearHoverTimer(): void {
        if (this.hoverTimer) {
            clearTimeout(this.hoverTimer);
            this.hoverTimer = null;
            
            logger.debug(`[${this.eventNamePrefix}]`, 'Cleared hover timer.');
        }
    }
    private clearFocusTimer(): void {
        if (this.focusTimer) {
            clearTimeout(this.focusTimer);
            this.focusTimer = null;
            
            logger.debug(`[${this.eventNamePrefix}]`, 'Cleared focus timer.');
        }
    }
    private clearTouchTimer(): void {
        if (this.touchTimer) {
            clearTimeout(this.touchTimer);
            this.touchTimer = null;
            
            logger.debug(`[${this.eventNamePrefix}]`, 'Cleared touch timer.');
        }
    }

    // --- Execution Logic ---
    // Determines if the action should run based on current state
    private shouldExecute(): boolean {
        if (!this.isInitialized) return false;

        if (this.isLoading) {
            
            logger.debug(`[${this.eventNamePrefix}]`, 'shouldExecute: false (already loading)');
            return false;
        }

        if (this.executeOnlyOnce && this.actionExecuted) {
            if (this.cacheEntry && !this.cacheEntry.isExpired()) {
                
                logger.debug(`[${this.eventNamePrefix}]`, 'shouldExecute: false (executeOnlyOnce, valid cache)');
                return false; // Already executed, valid cache exists
            }
            if (this.cacheEntry && this.cacheEntry.isExpired()) {
                
                logger.debug(`[${this.eventNamePrefix}]`, 'shouldExecute: true (executeOnlyOnce, cache expired)');
                return true; // Cache expired, allow re-execution
            }
            if (!this.cacheEntry) {
                
                logger.debug(`[${this.eventNamePrefix}]`, 'shouldExecute: false (executeOnlyOnce, no cache)');
                return false; // Already executed, no cache configured
            }
        }

        // Default case: okay to execute
        
        logger.debug(`[${this.eventNamePrefix}]`, 'shouldExecute: true');
        return true;
    }

    // Retrieves current data if available (cached or from previous execution if executeOnlyOnce)
    private getCachedOrExecutedResult(): { data: any; source: string } | undefined {
        if (this.cacheEntry && !this.cacheEntry.isExpired()) {
            return { data: this.cacheEntry.data, source: 'cache' };
        }
        if (this.executeOnlyOnce && this.actionExecuted && !this.cacheEntry) {
            return { data: this.actionResult, source: 'previous execution' };
        }
        return undefined;
    }


    // Aborts the currently running action, if any
    private abortAction(reason: string = 'unknown'): void {
        if (this.abortController && this.isLoading) {
            
            logger.debug(`[${this.eventNamePrefix}]`, `Aborting action. Reason: ${reason}`);
            // Pass a reason; AbortSignal standard uses DOMException
            const abortReason = new DOMException(`Action aborted: ${reason}`, 'AbortError');
            this.abortController.abort(abortReason);
            // State cleanup (isLoading=false, abortController=null) happens in the executeAction().catch() block
        }
    }

    // Core action execution flow
    private executeAction(): Promise<any> {
        if (!this.isInitialized) {
            return Promise.reject(new Error(`[${this.eventNamePrefix}] hoverAction not initialized`));
        }

        // Final check before execution starts
        if (this.isLoading) {
            
            logger.debug(`[${this.eventNamePrefix}]`, 'executeAction called while loading, returning existing promise.');
            // Should always have an actionPromise if isLoading is true
            return this.actionPromise ?? Promise.reject(new Error(`[${this.eventNamePrefix}] Inconsistent state: loading true but no actionPromise.`));
        }

        // Check for existing valid results again (cache or executeOnlyOnce)
        const existingResult = this.getCachedOrExecutedResult();
        if (existingResult) {
            
            logger.debug(`[${this.eventNamePrefix}]`, `executeAction returning data from ${existingResult.source}.`);
            if (this.onResult) { // Ensure onResult is called even when returning cached data
                try { this.onResult(existingResult.data); } catch (err) { logger.error('Error in onResult', err); }
            }
            return Promise.resolve(existingResult.data);
        }

        // Clear expired cache entry if present
        if (this.cacheEntry && this.cacheEntry.isExpired()) {
            
            logger.debug(`[${this.eventNamePrefix}]`, 'executeAction proceeding, cache expired.');
            this.cacheEntry = null;
        }

        
        logger.debug(`[${this.eventNamePrefix}]`, 'Executing action function...');
        this.setLoading(true);
        this.abortController = new AbortController(); // New controller for this run

        const signal = this.abortController.signal;
        const options = { signal };
        const reportProgress = (progress: any): void => {
            // Check signal wasn't aborted before calling potentially expensive callback
            if (!signal.aborted && this.onProgress) {
                try {
                    this.onProgress(progress);
                } catch (err) {
                    
                    (logger.error as any)(`[${this.eventNamePrefix}]`, 'Error in onProgress callback:', err);
                }
            }
        };

        // Store the promise immediately
        this.actionPromise = Promise.resolve()
            .then(() => this.action(options, reportProgress)) // Execute the provided action
            .then(result => {
                // Check if aborted *during* the action's async execution
                if (signal.aborted) {
                    
                    logger.debug(`[${this.eventNamePrefix}]`, 'Action resolved but was aborted before result processing.');
                    // Throw standard AbortError for consistent catch handling
                    throw signal.reason ?? new DOMException('Aborted', 'AbortError');
                }

                
                logger.debug(`[${this.eventNamePrefix}]`, 'Action executed successfully.', result);
                this.actionResult = result;
                this.actionExecuted = true;

                // Update cache if TTL is configured
                if (this.cacheTTL !== null && this.cacheTTL >= 0) { // Allow 0 TTL for session cache maybe?
                    this.cacheEntry = new cacheEntry(result, this.cacheTTL);
                    
                    logger.debug(`[${this.eventNamePrefix}]`, `Result cached with TTL: ${this.cacheTTL}ms`);
                }

                // === Success State Update ===
                this.setLoading(false);
                this.abortController = null; // Release controller
                // Keep actionPromise pointing to this resolved promise until next execution

                // Trigger callbacks and events
                if (this.onResult) {
                    try { this.onResult(result); } catch (err) { logger.error('Error in onResult', err); }
                }
                this.dispatchEvent('result', { result });

                return result; // Resolve the main promise with the result
            })
            .catch(err => {
                
                const isAbort = err instanceof DOMException && err.name === 'AbortError';

                if (isAbort) {
                    logger.debug(`[${this.eventNamePrefix}]`, 'Action aborted.');
                } else {
                    (logger.warn as any)(`[${this.eventNamePrefix}]`, 'Action execution failed.', err);
                }

                // === Error/Abort State Update ===
                this.setLoading(false);
                this.abortController = null; // Release controller
                this.actionPromise = null; // Clear promise on failure/abort to allow retry
                // Keep actionExecuted=true if executeOnlyOnce is set, even on failure?
                // Resetting actionExecuted=false seems more intuitive on failure, allowing retry. Let's reset it on non-abort errors.
                if (!isAbort) {
                    this.actionExecuted = false; // Allow retry on actual errors
                }

                // Trigger events
                if (isAbort) {
                    
                    logger.debug(`[${this.eventNamePrefix}]`, 'Action aborted.');
                    this.dispatchEvent('aborted', { reason: signal.reason });
                } else {
                    
                    (logger.error as any)(`[${this.eventNamePrefix}]`, 'Action encountered an error:', err);
                    this.dispatchEvent('error', { error: err });
                }

                // Rethrow the error for external callers
                throw err;
            });

        return this.actionPromise;
    }

    // --- Utility Methods ---
    // Update loading state and related attributes/classes
    private setLoading(isLoading: boolean): void {
        // Avoid redundant updates or updates if not initialized
        if (this.isLoading === isLoading || !this.isInitialized) return;
        this.isLoading = isLoading;

        
        logger.debug(`[${this.eventNamePrefix}]`, `Setting loading state: ${isLoading}`);
        if (this.element) { // Check element exists
            if (this.loadingClass) {
                this.element.classList.toggle(this.loadingClass, isLoading);
            }
            this.element.setAttribute('aria-busy', isLoading ? 'true' : 'false');
        }

        this.dispatchEvent(isLoading ? 'loadingStart' : 'loadingEnd');
    }

    // Wrapper for the onClick callback with error handling
    private handleClickWithResult(result: any, e: Event): void {
        
        logger.debug(`[${this.eventNamePrefix}]`, 'Calling onClick callback.');
        if (this.onClick) {
            try {
                this.onClick(result, e);
            } catch (err) {
                
                (logger.error as any)(`[${this.eventNamePrefix}]`, 'Error in onClick callback:', err);
            }
        }
        this.dispatchEvent('clickProcessed', { result, originalEvent: e });
    }

    // Dispatch custom events from the target element
    private dispatchEvent(eventName: string, detail: any = {}): boolean {
        if (!this.element || !this.isInitialized) return false;

        const event = new CustomEvent(`${this.eventNamePrefix}:${eventName}`, {
            detail: {
                ...detail,
                instance: this // Pass instance reference in event detail
            },
            bubbles: true,
            cancelable: true
        });
        return this.element.dispatchEvent(event);
    }
}

export default hoverAction;
export type { HoverActionOptions }; // Export the options type