import {calculateNormalized, getMaxValues} from "../../../comments/hooks/sorting/advanced/calculateNormalized";
import {
    calculateBayesianAverage,
    getAvgValues
} from "../../../comments/hooks/sorting/advanced/calculateBayesianAverage";
import {calculateWeightedZScore, getStats} from "../../../comments/hooks/sorting/advanced/calculateWeightedZScore";
import {Comment} from "../../../../types/commentTypes";

import {db} from "./database";
import Dexie from "dexie";

// Define the old database
