// FIXED FUNCTIONS - All issues resolved:
// 1. Broken down into small, focused functions
// 2. Eliminated deep nesting with early returns
// 3. Replaced magic numbers with named constants
// 4. Clear, descriptive variable names
// 5. Comprehensive error handling
// 6. No side effects - pure functions
// 7. Easily testable individual functions
// 8. Full documentation with JSDoc

interface UserData {
  id: string
  type: string
  status: string
  score: number
  createdAt: string
  processedScore?: number
  category?: string
}

interface ProcessedUser extends UserData {
  processedScore: number
  category: string
}

const CONFIG = {
  PREMIUM_SCORE_MULTIPLIER: 1.5,
  BASIC_SCORE_MULTIPLIER: 0.8,
  HIGH_SCORE_THRESHOLD: 50,
  MINIMUM_YEAR: 2020,
  MINIMUM_PROCESSED_SCORE: 10,
} as const

/**
 * Processes user data by filtering, transforming, sorting, and filtering again
 * @param data - Array of raw user data objects
 * @returns Array of processed and filtered user objects
 */
export function processUserData(data: UserData[]): ProcessedUser[] {
  if (!Array.isArray(data)) {
    throw new Error('Input must be an array')
  }

  const validUsers = data
    .filter(isValidUser)
    .map(processUser)
    .sort(sortByCategoryAndScore)
    .filter(hasMinimumScore)

  return validUsers
}

/**
 * Checks if an item is a valid active user
 * @param item - Data item to validate
 * @returns True if item is a valid active user
 */
function isValidUser(item: UserData): boolean {
  return (
    item &&
    typeof item === 'object' &&
    item.type === 'user' &&
    item.status === 'active' &&
    typeof item.score === 'number' &&
    item.score >= 0 &&
    item.score <= 100 &&
    typeof item.id === 'string'
  )
}

/**
 * Processes a single user by calculating score and determining category
 * @param user - User data to process
 * @returns Processed user object
 */
function processUser(user: UserData): ProcessedUser {
  const processedScore = calculateProcessedScore(user.score, user.createdAt)
  const category = determineCategory(user.score, user.createdAt)

  return {
    ...user,
    processedScore,
    category,
  }
}

/**
 * Calculates the processed score based on original score and creation date
 * @param score - Original user score
 * @param createdAt - User creation date string
 * @returns Processed score
 */
function calculateProcessedScore(score: number, createdAt: string): number {
  const isHighScore = score > CONFIG.HIGH_SCORE_THRESHOLD
  const isRecentUser = isRecentUserByDate(createdAt)

  if (isHighScore && isRecentUser) {
    return score * CONFIG.PREMIUM_SCORE_MULTIPLIER
  } else if (isHighScore) {
    return score // Regular user
  } else {
    return score * CONFIG.BASIC_SCORE_MULTIPLIER
  }
}

/**
 * Determines user category based on score and creation date
 * @param score - User score
 * @param createdAt - User creation date string
 * @returns User category
 */
function determineCategory(score: number, createdAt: string): string {
  const isHighScore = score > CONFIG.HIGH_SCORE_THRESHOLD
  const isRecentUser = isRecentUserByDate(createdAt)

  if (isHighScore && isRecentUser) {
    return 'premium'
  } else if (isHighScore) {
    return 'regular'
  } else {
    return 'basic'
  }
}

/**
 * Checks if user was created after the minimum year
 * @param createdAt - Creation date string
 * @returns True if user is recent
 */
function isRecentUserByDate(createdAt: string): boolean {
  try {
    const date = new Date(createdAt)
    return !isNaN(date.getTime()) && date.getFullYear() > CONFIG.MINIMUM_YEAR
  } catch {
    return false
  }
}

/**
 * Sorts users by category priority (premium first) then by processed score
 * @param a - First user to compare
 * @param b - Second user to compare
 * @returns Sort order (-1, 0, or 1)
 */
function sortByCategoryAndScore(a: ProcessedUser, b: ProcessedUser): number {
  // Premium users come first
  if (a.category === 'premium' && b.category !== 'premium') return -1
  if (b.category === 'premium' && a.category !== 'premium') return 1

  // Then sort by processed score (descending)
  return b.processedScore - a.processedScore
}

/**
 * Filters users to only include those with minimum processed score
 * @param user - User to check
 * @returns True if user meets minimum score requirement
 */
function hasMinimumScore(user: ProcessedUser): boolean {
  return user.processedScore > CONFIG.MINIMUM_PROCESSED_SCORE
}

/**
 * Saves the last processed user ID to localStorage (separated from main logic)
 * @param userId - User ID to save
 */
export function saveLastProcessedUser(userId: string): void {
  if (typeof window !== 'undefined' && typeof userId === 'string') {
    try {
      localStorage.setItem('lastProcessedUser', userId)
    } catch (error) {
      console.warn('Failed to save last processed user:', error)
    }
  }
}
