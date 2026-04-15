#include <iostream>
#include <cmath>

using namespace std;

int main() {
    ios::sync_with_stdio(0);
    cin.tie(0);
    long long n;
    if (!(cin >> n)) return 0;
    long long k = (long long)((-1.0 + sqrt(1.0 + 8.0 * n)) / 2.0);
    while (k * (k + 1) / 2 > n) k--;
    while ((k + 1) * (k + 2) / 2 <= n) k++;
    cout << k << "\n";
    return 0;
}
