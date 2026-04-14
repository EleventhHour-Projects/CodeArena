#include <iostream>
#include <cmath>

using namespace std;

int main() {
    ios::sync_with_stdio(0);
    cin.tie(0);
    int n;
    if (!(cin >> n)) return 0;
    int total = n * (n + 1) / 2;
    int x = sqrt(total);
    if (x * x == total) cout << x << "\n";
    else cout << "-1\n";
    return 0;
}
