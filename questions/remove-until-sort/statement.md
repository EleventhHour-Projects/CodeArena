## Problem Description
You are given an array of n positive integers. A game is played on this array following these rules:

If the array is already sorted in non-decreasing order (each element is less than or equal to the next one), the game stops immediately.

Otherwise, you may remove any one element from the array in a single move.

After each removal, the same condition is checked again.

Your objective is to determine the smallest possible size of the array once it becomes non-decreasing and the game ends.

## Input Format
The first line of each test case contains an integer n
The second line of each test case contains n integers, the elements of a
 

## Output Format
For each test case, output the minimum possible size of the array once the game ends.

## Constraints
1 ≤ n ≤ 10^5
1 ≤ a[i] ≤ 100

## Example & Sample Explanation
In the first test case, a minimum of 1 element can be achieved by removing 1, 2, and 3 in that order.