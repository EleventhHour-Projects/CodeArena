#include <iostream>
#include <vector>
#include <algorithm>
#include <climits>

using namespace std;

int main() {
    ios::sync_with_stdio(0);
    cin.tie(0);
    int n;
    if (!(cin >> n)) return 0;
    vector<int> arr(n);
    for (int i = 0; i < n; i++) cin >> arr[i];
    sort(arr.begin(), arr.end());
    int min_diff = INT_MAX;
    for (int i = 0; i < n - 1; i++) {
        min_diff = min(min_diff, arr[i+1] - arr[i]);
    }
    for (int i = 0; i < n - 1; i++) {
        if (arr[i+1] - arr[i] == min_diff) {
            cout << arr[i] << " " << arr[i+1] << "\n";
        }
    }
    return 0;
}
