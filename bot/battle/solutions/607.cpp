#include <iostream>
#include <string>

using namespace std;

int main() {
    ios::sync_with_stdio(0);
    cin.tie(0);
    int day, month, year;
    if (!(cin >> day)) return 0;
    cin >> month >> year;
    // Zeller-like: compute day of week
    // Use Tomohiko Sakamoto's algorithm
    int t[] = {0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4};
    int y = year;
    if (month < 3) y--;
    int dow = (y + y/4 - y/100 + y/400 + t[month-1] + day) % 7;
    string days[] = {"Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"};
    cout << days[dow] << "\n";
    return 0;
}
