#include <iostream>
#include <vector>
#include <algorithm>
#include <map>

using namespace std;

int digitSum(int n) {
    int sum = 0;
    while (n > 0) {
        sum += n % 10;
        n /= 10;
    }
    return sum;
}

int main() {
    ios::sync_with_stdio(0);
    cin.tie(0);
    int n;
    if (!(cin >> n)) return 0;
    map<int, int> groups;
    int maxSize = 0;
    for (int i = 1; i <= n; i++) {
        int ds = digitSum(i);
        groups[ds]++;
        maxSize = max(maxSize, groups[ds]);
    }
    int count = 0;
    for (auto const& [key, val] : groups) {
        if (val == maxSize) count++;
    }
    cout << count << "\n";
    return 0;
}
