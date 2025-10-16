// Custom sorting, searching, and filtering algorithms

const logger = require('../config/logger');

// Custom Trip Data Sorter
// Hybrid sorting algorithm using QuickSort and InsertionSort
class CustomTripSorter {
    constructor() {
        this.comparisonCount = 0;
        this.swapCount = 0;
        this.sortType = 'hybrid_quicksort';
    }

    // Sort trip data using hybrid algorithm
    sortTrips(trips, sortConfig = {}) {
        if (!trips || trips.length === 0) {
            return trips;
        }

        // Reset counters
        this.comparisonCount = 0;
        this.swapCount = 0;

        const startTime = Date.now();
        
        // Clone array to avoid mutating original
        const sortedTrips = [...trips];
        
        // Perform custom sort
        this._hybridSort(sortedTrips, 0, sortedTrips.length - 1, sortConfig);
        
        const endTime = Date.now();
        const duration = endTime - startTime;

        // Log performance metrics
        logger.info(`Custom sort completed: ${trips.length} trips in ${duration}ms`, {
            sortType: this.sortType,
            comparisons: this.comparisonCount,
            swaps: this.swapCount,
            config: sortConfig
        });

        return sortedTrips;
    }

    // Hybrid sorting algorithm (QuickSort + InsertionSort)
    _hybridSort(arr, low, high, config) {
        if (low < high) {
            // Use InsertionSort for small arrays (optimization)
            if (high - low + 1 <= 10) {
                this._insertionSort(arr, low, high, config);
            } else {
                // Use QuickSort for larger arrays
                const pivotIndex = this._partition(arr, low, high, config);
                this._hybridSort(arr, low, pivotIndex - 1, config);
                this._hybridSort(arr, pivotIndex + 1, high, config);
            }
        }
    }

    // InsertionSort for small arrays
    _insertionSort(arr, low, high, config) {
        for (let i = low + 1; i <= high; i++) {
            const key = arr[i];
            let j = i - 1;

            // Move elements greater than key one position ahead
            while (j >= low && this._compare(arr[j], key, config) > 0) {
                this.comparisonCount++;
                this._swap(arr, j + 1, arr[j]);
                j--;
            }
            
            this.comparisonCount++;
            arr[j + 1] = key;
        }
    }

    // Partition function using Lomuto scheme
    _partition(arr, low, high, config) {
        // Choose pivot (using median-of-three for better performance)
        const pivotIndex = this._choosePivot(arr, low, high);
        this._swap(arr, pivotIndex, high);
        
        const pivot = arr[high];
        let i = low - 1;

        for (let j = low; j < high; j++) {
            if (this._compare(arr[j], pivot, config) <= 0) {
                this.comparisonCount++;
                i++;
                this._swap(arr, i, j);
            }
        }
        
        this._swap(arr, i + 1, high);
        return i + 1;
    }

    // Choose pivot using median-of-three
    _choosePivot(arr, low, high) {
        const mid = Math.floor((low + high) / 2);
        
        // Sort low, mid, high and choose middle element
        if (arr[low] > arr[mid]) {
            if (arr[mid] > arr[high]) return mid;
            return arr[low] > arr[high] ? high : low;
        } else {
            if (arr[low] > arr[high]) return low;
            return arr[mid] > arr[high] ? high : mid;
        }
    }

    // Compare trips based on multiple criteria
    _compare(tripA, tripB, config = {}) {
        this.comparisonCount++;

        // Handle null/undefined cases
        if (!tripA && !tripB) return 0;
        if (!tripA) return 1;
        if (!tripB) return -1;

        // Default sort criteria (can be overridden)
        const criteria = config.criteria || [
            'pickup_datetime',
            'distance_km', 
            'data_quality_score',
            'trip_duration'
        ];

        // Multi-key comparison
        for (const criterion of criteria) {
            const order = config.order || 'asc';
            let comparison = 0;

            switch (criterion) {
                case 'pickup_datetime':
                    comparison = this._compareDates(tripA.pickup_datetime, tripB.pickup_datetime);
                    break;
                case 'distance_km':
                    comparison = this._compareNumbers(tripA.distance_km, tripB.distance_km);
                    break;
                case 'data_quality_score':
                    comparison = this._compareNumbers(tripA.data_quality_score, tripB.data_quality_score);
                    break;
                case 'trip_duration':
                    comparison = this._compareNumbers(tripA.trip_duration, tripB.trip_duration);
                    break;
                case 'speed_kmh':
                    comparison = this._compareNumbers(tripA.speed_kmh, tripB.speed_kmh);
                    break;
                case 'passenger_count':
                    comparison = this._compareNumbers(tripA.passenger_count, tripB.passenger_count);
                    break;
                default:
                    comparison = this._compareStrings(tripA[criterion], tripB[criterion]);
            }

            // Apply sort order
            if (order === 'desc') {
                comparison = -comparison;
            }

            // If this criterion determines order, return it
            if (comparison !== 0) {
                return comparison;
            }
        }

        return 0; // Equal
    }

    // Compare dates
    _compareDates(dateA, dateB) {
        if (!dateA && !dateB) return 0;
        if (!dateA) return -1;
        if (!dateB) return 1;
        
        const timeA = new Date(dateA).getTime();
        const timeB = new Date(dateB).getTime();
        
        if (timeA < timeB) return -1;
        if (timeA > timeB) return 1;
        return 0;
    }

    // Compare numbers
    _compareNumbers(numA, numB) {
        if (numA === null && numB === null) return 0;
        if (numA === null) return -1;
        if (numB === null) return 1;
        
        if (numA < numB) return -1;
        if (numA > numB) return 1;
        return 0;
    }

    // Compare strings
    _compareStrings(strA, strB) {
        if (!strA && !strB) return 0;
        if (!strA) return -1;
        if (!strB) return 1;
        
        return strA.localeCompare(strB);
    }

    // Swap array elements
    _swap(arr, i, j) {
        if (i !== j) {
            const temp = arr[i];
            arr[i] = arr[j];
            arr[j] = temp;
            this.swapCount++;
        }
    }

    // Get sorting metrics
    getMetrics() {
        return {
            comparisons: this.comparisonCount,
            swaps: this.swapCount,
            algorithm: this.sortType
        };
    }
}

// Custom Trip Data Filter
// Filters trip datasets based on multiple criteria
class CustomTripFilter {
    constructor() {
        this.filterCount = 0;
        this.matchCount = 0;
    }

    // Filter trips based on criteria
    filterTrips(trips, filters = {}) {
        if (!trips || trips.length === 0) {
            return trips;
        }

        this.filterCount = 0;
        this.matchCount = 0;

        const startTime = Date.now();
        const filteredTrips = [];

        for (const trip of trips) {
            this.filterCount++;
            
            if (this._matchesAllCriteria(trip, filters)) {
                filteredTrips.push(trip);
                this.matchCount++;
            }
        }

        const endTime = Date.now();
        const duration = endTime - startTime;

        logger.info(`Custom filter completed: ${this.filterCount} trips filtered in ${duration}ms`, {
            matches: this.matchCount,
            matchRate: ((this.matchCount / this.filterCount) * 100).toFixed(2) + '%',
            filters: Object.keys(filters)
        });

        return filteredTrips;
    }

    // Check if trip matches all filters
    _matchesAllCriteria(trip, filters) {
        for (const [key, filterValue] of Object.entries(filters)) {
            if (!this._matchesCriterion(trip, key, filterValue)) {
                return false;
            }
        }
        return true;
    }

    // Check if trip matches criterion
    _matchesCriterion(trip, key, filterValue) {
        if (filterValue === null || filterValue === undefined) {
            return true;
        }

        const tripValue = trip[key];

        switch (key) {
            case 'startDate':
                return this._matchesDateRange(trip.pickup_datetime, filterValue, 'start');
            case 'endDate':
                return this._matchesDateRange(trip.pickup_datetime, filterValue, 'end');
            case 'minDistance':
                return trip.distance_km >= filterValue;
            case 'maxDistance':
                return trip.distance_km <= filterValue;
            case 'minDuration':
                return trip.trip_duration >= filterValue;
            case 'maxDuration':
                return trip.trip_duration <= filterValue;
            case 'vendorName':
                return trip.vendor_name === filterValue;
            case 'passengerCount':
                return trip.passenger_count === filterValue;
            case 'dataCategory':
                return trip.data_category === filterValue;
            case 'minQuality':
                return trip.data_quality_score >= filterValue;
            default:
                return tripValue === filterValue;
        }
    }

    // Match date range
    _matchesDateRange(tripDate, filterDate, type) {
        if (!tripDate || !filterDate) return true;
        
        const tripTime = new Date(tripDate).getTime();
        const filterTime = new Date(filterDate).getTime();
        
        if (type === 'start') {
            return tripTime >= filterTime;
        } else {
            return tripTime <= filterTime;
        }
    }

    // Get filtering metrics
    getMetrics() {
        return {
            totalFiltered: this.filterCount,
            matches: this.matchCount,
            matchRate: this.filterCount > 0 ? (this.matchCount / this.filterCount) * 100 : 0
        };
    }
}

// Custom Trip Data Search
// Binary search for finding trips within time ranges
class CustomTripSearch {
    constructor() {
        this.searchCount = 0;
        this.comparisonCount = 0;
    }

    // Binary search for trips within time range
    searchTrips(trips, searchCriteria = {}) {
        if (!trips || trips.length === 0) {
            return [];
        }

        this.searchCount = 0;
        this.comparisonCount = 0;

        const startTime = Date.now();
        
        // Ensure trips are sorted by pickup_datetime
        const sortedTrips = [...trips].sort((a, b) => 
            new Date(a.pickup_datetime) - new Date(b.pickup_datetime)
        );

        const results = this._binarySearchRange(
            sortedTrips, 
            searchCriteria.startDate, 
            searchCriteria.endDate
        );

        const endTime = Date.now();
        const duration = endTime - startTime;

        logger.info(`Custom search completed: ${results.length} trips found in ${duration}ms`, {
            searchCount: this.searchCount,
            comparisons: this.comparisonCount,
            criteria: searchCriteria
        });

        return results;
    }

    // Binary search for date range
    _binarySearchRange(trips, startDate, endDate) {
        const startTime = startDate ? new Date(startDate).getTime() : 0;
        const endTime = endDate ? new Date(endDate).getTime() : Number.MAX_SAFE_INTEGER;

        // Find start of range
        const startIndex = this._findStartIndex(trips, startTime);
        
        // Find end of range
        const endIndex = this._findEndIndex(trips, endTime);

        // Return trips in range
        return trips.slice(startIndex, endIndex + 1);
    }

    // Find start index
    _findStartIndex(trips, targetTime) {
        let left = 0;
        let right = trips.length - 1;
        let result = trips.length;

        while (left <= right) {
            this.searchCount++;
            const mid = Math.floor((left + right) / 2);
            const midTime = new Date(trips[mid].pickup_datetime).getTime();
            
            this.comparisonCount++;
            if (midTime >= targetTime) {
                result = mid;
                right = mid - 1;
            } else {
                left = mid + 1;
            }
        }

        return result;
    }

    // Find end index
    _findEndIndex(trips, targetTime) {
        let left = 0;
        let right = trips.length - 1;
        let result = -1;

        while (left <= right) {
            this.searchCount++;
            const mid = Math.floor((left + right) / 2);
            const midTime = new Date(trips[mid].pickup_datetime).getTime();
            
            this.comparisonCount++;
            if (midTime <= targetTime) {
                result = mid;
                left = mid + 1;
            } else {
                right = mid - 1;
            }
        }

        return result;
    }

    // Get search metrics
    getMetrics() {
        return {
            searches: this.searchCount,
            comparisons: this.comparisonCount
        };
    }
}

module.exports = {
    CustomTripSorter,
    CustomTripFilter,
    CustomTripSearch
};
