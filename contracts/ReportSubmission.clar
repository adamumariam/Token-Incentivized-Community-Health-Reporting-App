(define-constant ERR-NOT-AUTHORIZED u100)
(define-constant ERR-INVALID-SYMPTOM-HASH u101)
(define-constant ERR-INVALID-LOCATION-HASH u102)
(define-constant ERR-INVALID-TIMESTAMP u103)
(define-constant ERR-REPORT-ALREADY-EXISTS u104)
(define-constant ERR-INVALID-STATUS u105)
(define-constant ERR-REPORTER-BANNED u106)
(define-constant ERR-INVALID-REPORT-ID u107)
(define-constant ERR-INVALID-PRIVACY-LEVEL u108)
(define-constant ERR-INVALID-SEVERITY u109)
(define-constant ERR-INVALID-CATEGORY u110)
(define-constant ERR-MAX-REPORTS-EXCEEDED u111)
(define-constant ERR-INVALID-UPDATE-PARAM u112)
(define-constant ERR-UPDATE-NOT-ALLOWED u113)
(define-constant ERR-AUTHORITY-NOT-VERIFIED u114)
(define-constant ERR-INVALID-ANONYMITY-LEVEL u115)
(define-constant ERR-INVALID-AGE-GROUP u116)
(define-constant ERR-INVALID-GENDER u117)
(define-constant ERR-INVALID-CONTACT-INFO u118)
(define-constant ERR-INVALID-VERIFICATION-STATUS u119)
(define-constant ERR-INVALID-REPORT-TYPE u120)

(define-data-var next-report-id uint u0)
(define-data-var max-reports uint u10000)
(define-data-var submission-fee uint u100)
(define-data-var authority-contract (optional principal) none)
(define-data-var banned-reporters (list 1000 principal) (list))

(define-map reports
  uint
  {
    reporter: principal,
    symptom-hash: (buff 32),
    location-hash: (buff 32),
    timestamp: uint,
    status: (string-ascii 20),
    privacy-level: uint,
    severity: uint,
    category: (string-ascii 50),
    anonymity-level: uint,
    age-group: (string-ascii 20),
    gender: (string-ascii 10),
    contact-info: (optional (string-ascii 100)),
    verification-status: bool,
    report-type: (string-ascii 20)
  }
)

(define-map reports-by-reporter
  principal
  (list 100 uint))

(define-map report-updates
  uint
  {
    update-symptom-hash: (buff 32),
    update-location-hash: (buff 32),
    update-timestamp: uint,
    updater: principal
  }
)

(define-read-only (get-report (id uint))
  (map-get? reports id)
)

(define-read-only (get-report-updates (id uint))
  (map-get? report-updates id)
)

(define-read-only (get-reports-by-reporter (reporter principal))
  (default-to (list) (map-get? reports-by-reporter reporter))
)

(define-private (validate-symptom-hash (hash (buff 32)))
  (if (is-eq (len hash) u32)
      (ok true)
      (err ERR-INVALID-SYMPTOM-HASH))
)

(define-private (validate-location-hash (hash (buff 32)))
  (if (is-eq (len hash) u32)
      (ok true)
      (err ERR-INVALID-LOCATION-HASH))
)

(define-private (validate-timestamp (ts uint))
  (if (>= ts block-height)
      (ok true)
      (err ERR-INVALID-TIMESTAMP))
)

(define-private (validate-status (status (string-ascii 20)))
  (if (or (is-eq status "pending") (is-eq status "validated") (is-eq status "rejected"))
      (ok true)
      (err ERR-INVALID-STATUS))
)

(define-private (validate-privacy-level (level uint))
  (if (and (>= level u0) (<= level u5))
      (ok true)
      (err ERR-INVALID-PRIVACY-LEVEL))
)

(define-private (validate-severity (sev uint))
  (if (and (>= sev u1) (<= sev u10))
      (ok true)
      (err ERR-INVALID-SEVERITY))
)

(define-private (validate-category (cat (string-ascii 50)))
  (if (and (> (len cat) u0) (<= (len cat) u50))
      (ok true)
      (err ERR-INVALID-CATEGORY))
)

(define-private (validate-anonymity-level (level uint))
  (if (and (>= level u0) (<= level u3))
      (ok true)
      (err ERR-INVALID-ANONYMITY-LEVEL))
)

(define-private (validate-age-group (group (string-ascii 20)))
  (if (or (is-eq group "0-18") (is-eq group "19-35") (is-eq group "36-60") (is-eq group "60+"))
      (ok true)
      (err ERR-INVALID-AGE-GROUP))
)

(define-private (validate-gender (gen (string-ascii 10)))
  (if (or (is-eq gen "male") (is-eq gen "female") (is-eq gen "other"))
      (ok true)
      (err ERR-INVALID-GENDER))
)

(define-private (validate-contact-info (info (optional (string-ascii 100))))
  (match info
    val (if (<= (len val) u100) (ok true) (err ERR-INVALID-CONTACT-INFO))
    (ok true))
)

(define-private (validate-report-type (typ (string-ascii 20)))
  (if (or (is-eq typ "symptom") (is-eq typ "outbreak") (is-eq typ "test-result"))
      (ok true)
      (err ERR-INVALID-REPORT-TYPE))
)

(define-private (is-banned (reporter principal))
  (fold or (map is-eq (var-get banned-reporters) (list reporter)) false)
)

(define-public (set-authority-contract (contract-principal principal))
  (begin
    (asserts! (is-none (var-get authority-contract)) (err ERR-AUTHORITY-NOT-VERIFIED))
    (var-set authority-contract (some contract-principal))
    (ok true)
  )
)

(define-public (set-max-reports (new-max uint))
  (begin
    (asserts! (> new-max u0) (err ERR-INVALID-UPDATE-PARAM))
    (asserts! (is-some (var-get authority-contract)) (err ERR-AUTHORITY-NOT-VERIFIED))
    (var-set max-reports new-max)
    (ok true)
  )
)

(define-public (set-submission-fee (new-fee uint))
  (begin
    (asserts! (>= new-fee u0) (err ERR-INVALID-UPDATE-PARAM))
    (asserts! (is-some (var-get authority-contract)) (err ERR-AUTHORITY-NOT-VERIFIED))
    (var-set submission-fee new-fee)
    (ok true)
  )
)

(define-public (ban-reporter (reporter principal))
  (begin
    (asserts! (is-eq tx-sender (unwrap! (var-get authority-contract) (err ERR-AUTHORITY-NOT-VERIFIED))) (err ERR-NOT-AUTHORIZED))
    (var-set banned-reporters (unwrap-panic (as-max-len? (append (var-get banned-reporters) reporter) u1000)))
    (ok true)
  )
)

(define-public (submit-report
  (symptom-hash (buff 32))
  (location-hash (buff 32))
  (privacy-level uint)
  (severity uint)
  (category (string-ascii 50))
  (anonymity-level uint)
  (age-group (string-ascii 20))
  (gender (string-ascii 10))
  (contact-info (optional (string-ascii 100)))
  (report-type (string-ascii 20))
)
  (let (
        (next-id (var-get next-report-id))
        (current-max (var-get max-reports))
        (authority (var-get authority-contract))
        (reporter tx-sender)
      )
    (asserts! (< next-id current-max) (err ERR-MAX-REPORTS-EXCEEDED))
    (asserts! (not (is-banned reporter)) (err ERR-REPORTER-BANNED))
    (try! (validate-symptom-hash symptom-hash))
    (try! (validate-location-hash location-hash))
    (try! (validate-privacy-level privacy-level))
    (try! (validate-severity severity))
    (try! (validate-category category))
    (try! (validate-anonymity-level anonymity-level))
    (try! (validate-age-group age-group))
    (try! (validate-gender gender))
    (try! (validate-contact-info contact-info))
    (try! (validate-report-type report-type))
    (asserts! (is-none (map-get? reports next-id)) (err ERR-REPORT-ALREADY-EXISTS))
    (let ((authority-recipient (unwrap! authority (err ERR-AUTHORITY-NOT-VERIFIED))))
      (try! (stx-transfer? (var-get submission-fee) tx-sender authority-recipient))
    )
    (map-set reports next-id
      {
        reporter: reporter,
        symptom-hash: symptom-hash,
        location-hash: location-hash,
        timestamp: block-height,
        status: "pending",
        privacy-level: privacy-level,
        severity: severity,
        category: category,
        anonymity-level: anonymity-level,
        age-group: age-group,
        gender: gender,
        contact-info: contact-info,
        verification-status: false,
        report-type: report-type
      }
    )
    (map-set reports-by-reporter reporter
      (unwrap-panic (as-max-len? (append (default-to (list) (map-get? reports-by-reporter reporter)) next-id) u100)))
    (var-set next-report-id (+ next-id u1))
    (print { event: "report-submitted", id: next-id })
    (ok next-id)
  )
)

(define-public (update-report
  (report-id uint)
  (update-symptom-hash (buff 32))
  (update-location-hash (buff 32))
)
  (let ((report (map-get? reports report-id)))
    (match report
      r
        (begin
          (asserts! (is-eq (get reporter r) tx-sender) (err ERR-NOT-AUTHORIZED))
          (asserts! (is-eq (get status r) "pending") (err ERR-UPDATE-NOT-ALLOWED))
          (try! (validate-symptom-hash update-symptom-hash))
          (try! (validate-location-hash update-location-hash))
          (map-set reports report-id
            (merge r {
              symptom-hash: update-symptom-hash,
              location-hash: update-location-hash,
              timestamp: block-height
            })
          )
          (map-set report-updates report-id
            {
              update-symptom-hash: update-symptom-hash,
              update-location-hash: update-location-hash,
              update-timestamp: block-height,
              updater: tx-sender
            }
          )
          (print { event: "report-updated", id: report-id })
          (ok true)
        )
      (err ERR-INVALID-REPORT-ID)
    )
  )
)

(define-public (set-report-status (report-id uint) (new-status (string-ascii 20)))
  (begin
    (asserts! (is-eq tx-sender (unwrap! (var-get authority-contract) (err ERR-AUTHORITY-NOT-VERIFIED))) (err ERR-NOT-AUTHORIZED))
    (try! (validate-status new-status))
    (let ((report (unwrap! (map-get? reports report-id) (err ERR-INVALID-REPORT-ID))))
      (map-set reports report-id (merge report { status: new-status }))
      (ok true)
    )
  )
)

(define-public (get-report-count)
  (ok (var-get next-report-id))
)