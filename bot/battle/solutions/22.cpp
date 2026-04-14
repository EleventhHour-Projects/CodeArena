#include <iostream>

using namespace std;

int main() {
    ios::sync_with_stdio(0);
    cin.tie(0);
    unsigned int n;
    if (!(cin >> n)) return 0;
    int count = 0;
    while (n > 0) {
        n &= (n - 1);
        count++;
    }
    cout << count << "\n";
    return 0;
}
